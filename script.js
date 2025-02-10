// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const cartBtn = document.getElementById('cartBtn');
const authModal = document.getElementById('authModal');
const dashboardModal = document.getElementById('dashboardModal');
const cartModal = document.getElementById('cartModal');
const closeButtons = document.querySelectorAll('.close');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const searchBtn = document.getElementById('searchBtn');
const projectList = document.querySelector('.project-list');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const chatWidget = document.getElementById('chatWidget');
const minimizeChatBtn = document.querySelector('.minimize-chat');
const authTabs = document.querySelectorAll('.auth-tab');
const dashboardTabs = document.querySelectorAll('.dashboard-tab');

// Stripe Setup
const stripe = Stripe('your_publishable_key'); // Replace with your Stripe publishable key
const elements = stripe.elements();
const card = elements.create('card');
card.mount('#card-element');

// Sample Data (In a real app, this would come from a backend)
let projects = [
    {
        id: 1,
        title: 'AI-Powered Smart Home System',
        description: 'A comprehensive smart home solution using artificial intelligence for automation and energy efficiency.',
        price: 2999.99,
        category: 'technology',
        tags: ['AI', 'IoT', 'Smart Home'],
        rating: 4.5,
        reviews: [
            { user: 'John D.', rating: 5, comment: 'Amazing innovation!' },
            { user: 'Sarah M.', rating: 4, comment: 'Great potential.' }
        ],
        images: ['https://picsum.photos/200/300', 'https://picsum.photos/200/301']
    },
    {
        id: 2,
        title: 'Sustainable Energy Generator',
        description: 'Revolutionary energy generator that converts waste into clean, renewable energy.',
        price: 5999.99,
        category: 'engineering',
        tags: ['Green Energy', 'Sustainability'],
        rating: 4.8,
        reviews: [
            { user: 'Mike R.', rating: 5, comment: 'Game-changing technology!' }
        ],
        images: ['https://picsum.photos/200/302', 'https://picsum.photos/200/303']
    }
];

let cart = [];
let currentUser = null;
let messages = [];

// Event Listeners
loginBtn.addEventListener('click', () => showModal(authModal));
dashboardBtn.addEventListener('click', () => showModal(dashboardModal));
cartBtn.addEventListener('click', () => showModal(cartModal));
minimizeChatBtn.addEventListener('click', toggleChat);

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        authModal.style.display = 'none';
        dashboardModal.style.display = 'none';
        cartModal.style.display = 'none';
    });
});

searchBtn.addEventListener('click', filterProjects);
categoryFilter.addEventListener('change', filterProjects);
checkoutBtn.addEventListener('click', handleCheckout);

// Auth Tabs
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetForm = tab.dataset.tab;
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${targetForm}Form`).classList.add('active');
    });
});

// Dashboard Tabs
dashboardTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetSection = tab.dataset.tab;
        dashboardTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(targetSection).classList.add('active');
    });
});

// Functions
function showModal(modal) {
    modal.style.display = 'block';
}

function filterProjects() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    
    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.title.toLowerCase().includes(searchTerm) ||
                            project.description.toLowerCase().includes(searchTerm) ||
                            project.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        const matchesCategory = !category || project.category === category;
        return matchesSearch && matchesCategory;
    });
    
    displayProjects(filteredProjects);
}

function displayProjects(projectsToDisplay) {
    projectList.innerHTML = '';
    projectsToDisplay.forEach(project => {
        const projectElement = createProjectElement(project);
        projectList.appendChild(projectElement);
    });
}

function createProjectElement(project) {
    const div = document.createElement('div');
    div.className = 'project-item';
    
    // Create image slider if multiple images
    let imageSlider = '';
    if (project.images && project.images.length > 0) {
        imageSlider = `
            <div class="project-images">
                <div class="image-slider">
                    ${project.images.map((img, index) => `
                        <img src="${img}" alt="${project.title} image ${index + 1}" 
                            class="${index === 0 ? 'active' : ''}"
                            onclick="showFullImage(this.src)">
                    `).join('')}
                </div>
                ${project.images.length > 1 ? `
                    <button class="slider-nav prev" onclick="slideImage(-1, this)">❮</button>
                    <button class="slider-nav next" onclick="slideImage(1, this)">❯</button>
                ` : ''}
            </div>
        `;
    }

    div.innerHTML = `
        ${imageSlider}
        <div class="project-content">
            <h3>${project.title}</h3>
            <p class="project-description">${project.description}</p>
            <div class="project-meta">
                <div class="project-tags">
                    ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="project-rating">
                    <span class="stars">${'★'.repeat(Math.floor(project.rating))}${project.rating % 1 ? '½' : ''}</span>
                    <span class="rating-value">${project.rating.toFixed(1)}</span>
                    <span class="review-count">(${project.reviews.length} reviews)</span>
                </div>
            </div>
            <div class="project-footer">
                <div class="project-info">
                    <p class="price">$${project.price.toFixed(2)}</p>
                    <p class="innovator">By: ${project.innovator}</p>
                    <p class="date">Posted: ${formatDate(project.dateAdded)}</p>
                </div>
                <div class="project-actions">
                    ${currentUser && currentUser.accountType === 'buyer' ? `
                        <button class="buy-now" onclick="buyNow(${project.id})">Buy Now</button>
                        <button onclick="addToCart(${project.id})">Add to Cart</button>
                    ` : currentUser && currentUser.accountType === 'innovator' && project.innovatorId === currentUser.email ? `
                        <button onclick="editProject(${project.id})">Edit</button>
                        <button onclick="deleteProject(${project.id})">Delete</button>
                    ` : ''}
                    <button onclick="showProjectDetails(${project.id})">View Details</button>
                </div>
            </div>
        </div>
    `;
    return div;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function showProjectDetails(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content project-details">
            <span class="close">&times;</span>
            <div class="project-gallery">
                ${project.images.map(img => `
                    <img src="${img}" alt="${project.title}" onclick="showFullImage(this.src)">
                `).join('')}
            </div>
            <div class="project-info">
                <h2>${project.title}</h2>
                <p class="description">${project.description}</p>
                <div class="meta-info">
                    <p class="price">Price: $${project.price.toFixed(2)}</p>
                    <p class="innovator">Created by: ${project.innovator}</p>
                    <p class="category">Category: ${project.category}</p>
                    <div class="tags">
                        ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
                <div class="reviews-section">
                    <h3>Reviews (${project.reviews.length})</h3>
                    <div class="reviews-list">
                        ${project.reviews.map(review => `
                            <div class="review">
                                <div class="review-header">
                                    <span class="reviewer">${review.user}</span>
                                    <span class="rating">${'★'.repeat(review.rating)}</span>
                                </div>
                                <p class="comment">${review.comment}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${currentUser && currentUser.accountType === 'buyer' ? `
                    <div class="purchase-options">
                        <button class="buy-now" onclick="buyNow(${project.id})">Buy Now ($${project.price.toFixed(2)})</button>
                        <button onclick="addToCart(${project.id})">Add to Cart</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
    };
}

function buyNow(projectId) {
    if (!currentUser) {
        showModal(authModal);
        return;
    }

    if (currentUser.accountType !== 'buyer') {
        alert('Only buyers can purchase projects');
        return;
    }

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Clear existing cart and add this item
    cart = [project];
    updateCart();
    showModal(cartModal);
}

function showFullImage(src) {
    const modal = document.createElement('div');
    modal.className = 'modal image-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <img src="${src}" alt="Full size image">
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
    };
}

function slideImage(direction, button) {
    const slider = button.parentElement.querySelector('.image-slider');
    const images = slider.querySelectorAll('img');
    const activeImage = slider.querySelector('img.active');
    let currentIndex = Array.from(images).indexOf(activeImage);
    
    images[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + direction + images.length) % images.length;
    images[currentIndex].classList.add('active');
}

function addToCart(projectId) {
    if (!currentUser) {
        showModal(authModal);
        return;
    }
    
    const project = projects.find(p => p.id === projectId);
    if (project) {
        cart.push(project);
        updateCart();
        updateCartCount();
    }
}

function updateCart() {
    cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <span>${item.title}</span>
            <span>$${item.price.toFixed(2)}</span>
            <button onclick="removeFromCart(${item.id})">Remove</button>
        `;
        cartItems.appendChild(itemElement);
        total += item.price;
    });
    
    cartTotal.textContent = `Total: $${total.toFixed(2)}`;
}

function removeFromCart(projectId) {
    const index = cart.findIndex(item => item.id === projectId);
    if (index !== -1) {
        cart.splice(index, 1);
        updateCart();
        updateCartCount();
    }
}

function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    cartCount.textContent = cart.length;
}

async function handleCheckout() {
    if (!currentUser) {
        showModal(authModal);
        return;
    }
    
    try {
        const {token, error} = await stripe.createToken(card);
        
        if (error) {
            const errorElement = document.getElementById('card-errors');
            errorElement.textContent = error.message;
            return;
        }
        
        // Here you would send the token to your server to complete the charge
        console.log('Payment processed with token:', token);
        
        // Clear cart after successful payment
        cart = [];
        updateCart();
        updateCartCount();
        cartModal.style.display = 'none';
        
        alert('Payment successful! Thank you for your purchase.');
    } catch (err) {
        console.error('Payment error:', err);
        alert('There was an error processing your payment. Please try again.');
    }
}

function toggleChat() {
    const chatMessages = document.querySelector('.chat-messages');
    const chatInput = document.querySelector('.chat-input');
    
    if (chatMessages.style.display === 'none') {
        chatMessages.style.display = 'block';
        chatInput.style.display = 'flex';
        minimizeChatBtn.textContent = '−';
    } else {
        chatMessages.style.display = 'none';
        chatInput.style.display = 'none';
        minimizeChatBtn.textContent = '+';
    }
}

function handleLogin(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;
    
    // Here you would validate credentials with your backend
    currentUser = { email, name: email.split('@')[0] };
    dashboardBtn.classList.remove('hidden');
    loginBtn.style.display = 'none';
    signupBtn.style.display = 'none';
    authModal.style.display = 'none';
}

function handleSignup(event) {
    event.preventDefault();
    const name = event.target.querySelector('input[type="text"]').value;
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;
    const accountType = event.target.querySelector('select').value;
    
    // Here you would create account in your backend
    currentUser = { email, name, accountType };
    dashboardBtn.classList.remove('hidden');
    loginBtn.style.display = 'none';
    signupBtn.style.display = 'none';
    authModal.style.display = 'none';
}

// Add these new functions for project submission
function showProjectForm() {
    if (!currentUser || currentUser.accountType !== 'innovator') {
        alert('Only innovators can submit projects');
        return;
    }
    document.getElementById('submit-project').classList.remove('hidden');
}

function handleProjectSubmission(event) {
    event.preventDefault();
    
    if (!currentUser || currentUser.accountType !== 'innovator') {
        alert('Only innovators can submit projects');
        return;
    }
    
    const form = event.target;
    const title = form.querySelector('input[placeholder="Project Title"]').value;
    const description = form.querySelector('textarea[placeholder="Project Description"]').value;
    const price = parseFloat(form.querySelector('input[placeholder="Price ($)"]').value);
    const category = form.querySelector('select').value;
    const tagsInput = form.querySelector('.tag-input input').value;
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    const files = form.querySelector('input[type="file"]').files;
    
    // Validate form data
    if (!title || !description || !price || !category || tags.length === 0 || files.length === 0) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Create project object
    const newProject = {
        id: projects.length + 1,
        title,
        description,
        price,
        category,
        tags,
        rating: 0,
        reviews: [],
        innovator: currentUser.name,
        innovatorId: currentUser.email,
        images: [],
        dateAdded: new Date().toISOString()
    };
    
    // Handle image uploads
    const imagePromises = Array.from(files).map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    });
    
    Promise.all(imagePromises)
        .then(images => {
            newProject.images = images;
            
            // Add project to projects array
            projects.unshift(newProject);
            
            // Add project to user's dashboard
            if (!currentUser.projects) {
                currentUser.projects = [];
            }
            currentUser.projects.unshift(newProject);
            
            // Update dashboard display
            updateDashboardProjects();
            
            // Clear form
            form.reset();
            document.getElementById('submit-project').classList.add('hidden');
            
            // Show success message
            alert('Project submitted successfully!');
            
            // Refresh projects display
            displayProjects(projects);
        });
}

function updateDashboardProjects() {
    if (!currentUser || !currentUser.projects) return;
    
    const projectGrid = document.querySelector('#my-projects .project-grid');
    projectGrid.innerHTML = '';
    
    currentUser.projects.forEach(project => {
        const projectElement = document.createElement('div');
        projectElement.className = 'dashboard-project-card';
        projectElement.innerHTML = `
            <div class="project-image">
                <img src="${project.images[0]}" alt="${project.title}">
            </div>
            <div class="project-info">
                <h4>${project.title}</h4>
                <p class="price">$${project.price.toFixed(2)}</p>
                <div class="project-stats">
                    <span><i class="fas fa-star"></i> ${project.rating.toFixed(1)}</span>
                    <span><i class="fas fa-comment"></i> ${project.reviews.length}</span>
                </div>
                <div class="project-actions">
                    <button onclick="editProject(${project.id})">Edit</button>
                    <button onclick="deleteProject(${project.id})">Delete</button>
                </div>
            </div>
        `;
        projectGrid.appendChild(projectElement);
    });
}

function editProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project || project.innovatorId !== currentUser.email) {
        alert('You do not have permission to edit this project');
        return;
    }
    
    // Show edit form with current project data
    const form = document.getElementById('projectSubmissionForm');
    form.querySelector('input[placeholder="Project Title"]').value = project.title;
    form.querySelector('textarea[placeholder="Project Description"]').value = project.description;
    form.querySelector('input[placeholder="Price ($)"]').value = project.price;
    form.querySelector('select').value = project.category;
    form.querySelector('.tag-input input').value = project.tags.join(', ');
    
    // Show the form
    document.getElementById('submit-project').classList.remove('hidden');
    
    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth' });
}

function deleteProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project || project.innovatorId !== currentUser.email) {
        alert('You do not have permission to delete this project');
        return;
    }
    
    if (confirm('Are you sure you want to delete this project?')) {
        // Remove from projects array
        const index = projects.findIndex(p => p.id === projectId);
        projects.splice(index, 1);
        
        // Remove from user's projects
        const userProjectIndex = currentUser.projects.findIndex(p => p.id === projectId);
        currentUser.projects.splice(userProjectIndex, 1);
        
        // Update displays
        updateDashboardProjects();
        displayProjects(projects);
        
        alert('Project deleted successfully');
    }
}

// Add event listeners
document.getElementById('projectSubmissionForm').addEventListener('submit', handleProjectSubmission);

// Update initialization
function initializeApp() {
    displayProjects(projects);
    updateCartCount();
    toggleChat();
    
    // Add submit project button to header if user is innovator
    if (currentUser && currentUser.accountType === 'innovator') {
        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit New Project';
        submitBtn.onclick = showProjectForm;
        document.querySelector('.nav-links').appendChild(submitBtn);
    }
}

// Initialize the page
initializeApp();

// Add form submit handlers
document.querySelector('#loginForm form').addEventListener('submit', handleLogin);
document.querySelector('#signupForm form').addEventListener('submit', handleSignup);
