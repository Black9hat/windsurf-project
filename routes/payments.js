const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');

// Create payment intent
router.post('/create-payment-intent', auth, async (req, res) => {
    try {
        const { projectId } = req.body;
        const project = await Project.findById(projectId);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Create or retrieve Stripe customer
        const user = await User.findById(req.user.userId);
        let customer;
        if (user.stripeCustomerId) {
            customer = await stripe.customers.retrieve(user.stripeCustomerId);
        } else {
            customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user._id.toString()
                }
            });
            user.stripeCustomerId = customer.id;
            await user.save();
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(project.price * 100), // Convert to cents
            currency: 'usd',
            customer: customer.id,
            metadata: {
                projectId: project._id.toString(),
                buyerId: user._id.toString(),
                sellerId: project.innovator.toString()
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Payment processing error' });
    }
});

// Handle successful payment
router.post('/payment-success', auth, async (req, res) => {
    try {
        const { paymentIntentId, projectId } = req.body;

        // Verify payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ message: 'Payment not successful' });
        }

        const project = await Project.findById(projectId);
        const buyer = await User.findById(req.user.userId);
        const seller = await User.findById(project.innovator);

        // Record purchase
        project.purchases.push({
            buyer: buyer._id,
            transactionId: paymentIntentId
        });
        await project.save();

        // Update buyer's purchases
        buyer.purchases.push(project._id);
        await buyer.save();

        // Create transfer to seller (you might want to implement your own commission structure)
        const transfer = await stripe.transfers.create({
            amount: Math.round(project.price * 90), // 90% to seller
            currency: 'usd',
            destination: seller.stripeAccountId, // Assuming seller has connected their Stripe account
            transfer_group: paymentIntentId
        });

        res.json({
            message: 'Payment processed successfully',
            purchase: {
                project: project._id,
                transactionId: paymentIntentId,
                amount: project.price,
                date: new Date()
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error processing payment confirmation' });
    }
});

// Get purchase history
router.get('/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .populate({
                path: 'purchases',
                populate: {
                    path: 'innovator',
                    select: 'name email'
                }
            });

        res.json(user.purchases);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching purchase history' });
    }
});

// Get sales history (for innovators)
router.get('/sales', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user.accountType !== 'innovator') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const projects = await Project.find({ innovator: user._id })
            .populate({
                path: 'purchases.buyer',
                select: 'name email'
            });

        const sales = projects.reduce((acc, project) => {
            return [...acc, ...project.purchases.map(purchase => ({
                project: {
                    id: project._id,
                    title: project.title,
                    price: project.price
                },
                buyer: purchase.buyer,
                date: purchase.purchaseDate,
                transactionId: purchase.transactionId
            }))];
        }, []);

        res.json(sales);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching sales history' });
    }
});

// Request refund
router.post('/refund', auth, async (req, res) => {
    try {
        const { purchaseId, reason } = req.body;
        const purchase = await Purchase.findById(purchaseId);
        
        if (!purchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }

        if (purchase.buyer.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Create refund
        const refund = await stripe.refunds.create({
            payment_intent: purchase.transactionId,
            reason: 'requested_by_customer'
        });

        purchase.status = 'refunded';
        purchase.refundReason = reason;
        purchase.refundDate = new Date();
        await purchase.save();

        res.json({ message: 'Refund processed successfully', refund });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error processing refund' });
    }
});

module.exports = router;
