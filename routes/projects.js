const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum size is 5MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 10 files.' });
    }
    return res.status(400).json({ message: 'Error uploading files.' });
  }
  next(err);
};

// Get all projects (for buyers)
router.get('/', async (req, res) => {
  try {
    const { sort = 'newest', category, search } = req.query;
    const query = { status: 'published' }; // Only show published projects to buyers

    // Apply category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Apply search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'popular':
        sortOptions = { likesCount: -1 };
        break;
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'rating':
        sortOptions = { averageRating: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const projects = await Project.find(query)
      .populate('innovator', 'name email avatar')
      .sort(sortOptions);

    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get innovator's projects (requires auth)
router.get('/my-projects', auth, async (req, res) => {
  try {
    const { sort = 'newest', category, search } = req.query;
    const query = { innovator: req.user.userId };

    // Apply category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Apply search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'popular':
        sortOptions = { likesCount: -1 };
        break;
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'rating':
        sortOptions = { averageRating: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const projects = await Project.find(query)
      .populate('innovator', 'name email avatar')
      .sort(sortOptions);

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new project
router.post('/', auth, upload.array('images', 10), handleMulterError, async (req, res) => {
  try {
    // Check if user is an innovator
    if (!req.user || req.user.accountType !== 'innovator') {
      console.log('User account type:', req.user ? req.user.accountType : 'undefined');
      return res.status(403).json({ message: 'Only innovators can create projects' });
    }

    const { title, description, price, category } = req.body;
    let tags = [];
    
    try {
      tags = JSON.parse(req.body.tags || '[]');
    } catch (e) {
      console.warn('Error parsing tags:', e);
    }

    // Validate required fields
    if (!title || !description || !price || !category) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate price
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    // Upload images to Cloudinary
    const imagePromises = (req.files || []).map(file => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
          folder: 'marketplace_projects'
        }, (error, result) => {
          if (error) reject(error);
          else resolve({ url: result.secure_url, publicId: result.public_id });
        });

        stream.end(file.buffer);
      });
    });

    const images = await Promise.all(imagePromises);

    // Create project
    const project = new Project({
      title: title.trim(),
      description: description.trim(),
      price: numericPrice,
      category,
      tags: tags.map(tag => tag.trim()).filter(tag => tag.length > 0),
      images,
      innovator: req.user.userId,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await project.save();

    // Populate innovator details
    await project.populate('innovator', 'name email avatar');

    res.status(201).json(project);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ message: 'Error creating project. Please try again.' });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('innovator', 'name email avatar');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update project
router.patch('/:id', auth, upload.array('images', 10), handleMulterError, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      innovator: req.user.userId
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }

    // Update fields if provided
    const updates = ['title', 'description', 'price', 'category', 'status'];
    updates.forEach(field => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    // Update tags if provided
    if (req.body.tags) {
      try {
        project.tags = JSON.parse(req.body.tags);
      } catch (e) {
        console.warn('Error parsing tags:', e);
      }
    }

    // Upload new images if provided
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({
            folder: 'marketplace_projects'
          }, (error, result) => {
            if (error) reject(error);
            else resolve({ url: result.secure_url, publicId: result.public_id });
          });

          stream.end(file.buffer);
        });
      });

      const newImages = await Promise.all(imagePromises);
      project.images = [...project.images, ...newImages];
    }

    project.updatedAt = new Date();
    await project.save();
    
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      innovator: req.user.userId
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }

    // Delete images from Cloudinary
    const deletePromises = project.images.map(image => {
      return cloudinary.uploader.destroy(image.publicId);
    });
    await Promise.all(deletePromises);

    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like/Unlike project
router.post('/:id/like', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const likeIndex = project.likes.indexOf(req.user.userId);
    
    if (likeIndex === -1) {
      // Like project
      project.likes.push(req.user.userId);
      project.likesCount = project.likes.length;
    } else {
      // Unlike project
      project.likes.splice(likeIndex, 1);
      project.likesCount = project.likes.length;
    }

    await project.save();
    res.json({ likes: project.likesCount, isLiked: likeIndex === -1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add review and rating
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has already reviewed
    const existingReview = project.reviews.find(
      review => review.user.toString() === req.user.userId
    );

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this project' });
    }

    // Add new review
    project.reviews.push({
      user: req.user.userId,
      rating,
      comment,
      createdAt: new Date()
    });

    // Update average rating
    const totalRating = project.reviews.reduce((sum, review) => sum + review.rating, 0);
    project.averageRating = totalRating / project.reviews.length;
    project.reviewCount = project.reviews.length;

    await project.save();
    await project.populate('reviews.user', 'name avatar');

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all projects with filters
router.get('/filtered', async (req, res) => {
  try {
    const { category, tags, minPrice, maxPrice, sort } = req.query;
    const query = {};

    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    let projectsQuery = Project.find(query).populate('innovator', 'name');

    // Sorting
    if (sort) {
      switch (sort) {
        case 'price_asc':
          projectsQuery = projectsQuery.sort({ price: 1 });
          break;
        case 'price_desc':
          projectsQuery = projectsQuery.sort({ price: -1 });
          break;
        case 'rating':
          projectsQuery = projectsQuery.sort({ averageRating: -1 });
          break;
        case 'newest':
          projectsQuery = projectsQuery.sort({ createdAt: -1 });
          break;
      }
    }

    const projects = await projectsQuery.exec();
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save a project
router.post('/save/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if project is already saved
    const isSaved = user.savedProjects.some(saved => 
      saved.project.toString() === project._id.toString()
    );

    if (isSaved) {
      return res.status(400).json({ message: 'Project already saved' });
    }

    user.savedProjects.push({ project: project._id });
    await user.save();

    res.json({ message: 'Project saved successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Unsave a project
router.delete('/unsave/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    user.savedProjects = user.savedProjects.filter(
      saved => saved.project.toString() !== req.params.id
    );
    
    await user.save();
    res.json({ message: 'Project removed from saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get saved projects
router.get('/saved', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'savedProjects.project',
        populate: { path: 'innovator', select: 'name email' }
      });
    
    const savedProjects = user.savedProjects.map(saved => ({
      ...saved.project.toObject(),
      savedAt: saved.savedAt
    }));
    
    res.json(savedProjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
