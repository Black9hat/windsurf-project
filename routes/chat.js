const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

// Create or get chat room
router.post('/room', auth, async (req, res) => {
    try {
        const { otherUserId } = req.body;
        
        // Check if chat already exists
        let chat = await Chat.findOne({
            participants: {
                $all: [req.user.userId, otherUserId]
            }
        });

        if (!chat) {
            // Create new chat room
            chat = new Chat({
                participants: [req.user.userId, otherUserId],
                messages: []
            });
            await chat.save();
        }

        // Populate participant details
        await chat.populate('participants', 'name email');
        
        res.json(chat);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating chat room' });
    }
});

// Get user's chat rooms
router.get('/rooms', auth, async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: req.user.userId
        })
        .populate('participants', 'name email')
        .populate({
            path: 'messages',
            options: {
                sort: { createdAt: -1 },
                limit: 1
            }
        });

        res.json(chats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching chat rooms' });
    }
});

// Get chat history
router.get('/messages/:roomId', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.roomId)
            .populate('messages')
            .populate('participants', 'name email');

        if (!chat) {
            return res.status(404).json({ message: 'Chat room not found' });
        }

        // Verify user is participant
        if (!chat.participants.some(p => p._id.toString() === req.user.userId)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(chat.messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// Send message
router.post('/message', auth, async (req, res) => {
    try {
        const { roomId, content } = req.body;
        
        const chat = await Chat.findById(roomId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat room not found' });
        }

        // Verify user is participant
        if (!chat.participants.includes(req.user.userId)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const message = new Message({
            chat: chat._id,
            sender: req.user.userId,
            content,
            readBy: [req.user.userId]
        });

        await message.save();
        
        chat.messages.push(message._id);
        chat.lastMessage = message._id;
        await chat.save();

        // Populate sender details
        await message.populate('sender', 'name email');

        // Emit socket event for real-time update
        req.app.get('io').to(roomId).emit('new_message', message);

        res.json(message);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error sending message' });
    }
});

// Mark messages as read
router.put('/read/:roomId', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.roomId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat room not found' });
        }

        // Update all unread messages in this chat
        await Message.updateMany(
            {
                chat: chat._id,
                readBy: { $ne: req.user.userId }
            },
            {
                $addToSet: { readBy: req.user.userId }
            }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error marking messages as read' });
    }
});

// Delete message
router.delete('/message/:messageId', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Verify user is sender
        if (message.sender.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await message.remove();
        res.json({ message: 'Message deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting message' });
    }
});

module.exports = router;
