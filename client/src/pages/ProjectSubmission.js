import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Container = styled.div`
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  margin-bottom: 2rem;
  color: #333;
`;

const Form = styled.form`
  display: grid;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: #666;
`;

const Input = styled.input`
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const TextArea = styled.textarea`
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  min-height: 150px;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const Select = styled.select`
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const ImageUpload = styled.div`
  border: 2px dashed #ddd;
  padding: 2rem;
  text-align: center;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    border-color: #007bff;
  }
`;

const ImagePreview = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
`;

const Button = styled.button`
  background: #007bff;
  color: white;
  padding: 1rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  &:hover {
    background: #0056b3;
  }
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  padding: 1rem;
  background: #f8d7da;
  border-radius: 4px;
  margin-bottom: 1rem;
  display: ${props => props.show ? 'block' : 'none'};
`;

const ProjectSubmission = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    tags: '',
    images: []
  });
  const [previewImages, setPreviewImages] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setError('Please upload only image files');
      return;
    }

    // Validate file sizes (max 5MB each)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError('Each image must be less than 5MB');
      return;
    }

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));

    // Create preview URLs
    const newPreviewImages = files.map(file => URL.createObjectURL(file));
    setPreviewImages(prev => [...prev, ...newPreviewImages]);
    setError('');
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!formData.price || formData.price <= 0) {
      setError('Please enter a valid price');
      return false;
    }
    if (!formData.category) {
      setError('Please select a category');
      return false;
    }
    if (formData.images.length === 0) {
      setError('Please upload at least one image');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formDataToSend = new FormData();
      
      // Add text fields
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('price', parseFloat(formData.price));
      formDataToSend.append('category', formData.category);
      
      // Process tags
      if (formData.tags) {
        const tags = formData.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
        formDataToSend.append('tags', JSON.stringify(tags));
      }

      // Add images
      formData.images.forEach(image => {
        formDataToSend.append('images', image);
      });

      await axios.post('/api/projects', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      // Clean up preview URLs
      previewImages.forEach(url => URL.revokeObjectURL(url));
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting project:', error);
      setError(
        error.response?.data?.message ||
        'Failed to submit project. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Title>Submit New Project</Title>
      <ErrorMessage show={!!error}>{error}</ErrorMessage>
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Project Title</Label>
          <Input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            maxLength={100}
            placeholder="Enter a descriptive title"
          />
        </FormGroup>

        <FormGroup>
          <Label>Description</Label>
          <TextArea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            maxLength={2000}
            placeholder="Describe your project in detail"
          />
        </FormGroup>

        <FormGroup>
          <Label>Price ($)</Label>
          <Input
            type="number"
            name="price"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={handleChange}
            required
            placeholder="Enter the price in USD"
          />
        </FormGroup>

        <FormGroup>
          <Label>Category</Label>
          <Select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select a category</option>
            <option value="technology">Technology</option>
            <option value="design">Design</option>
            <option value="science">Science</option>
            <option value="engineering">Engineering</option>
            <option value="other">Other</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Tags (comma-separated)</Label>
          <Input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="e.g., innovation, technology, AI"
          />
        </FormGroup>

        <FormGroup>
          <Label>Images (Max 5MB each)</Label>
          <ImageUpload>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={{ display: 'none' }}
              id="image-upload"
            />
            <label htmlFor="image-upload">
              Click or drag images here to upload
            </label>
            <ImagePreview>
              {previewImages.map((url, index) => (
                <PreviewImage key={index} src={url} alt={`Preview ${index + 1}`} />
              ))}
            </ImagePreview>
          </ImageUpload>
        </FormGroup>

        <Button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Project'}
        </Button>
      </Form>
    </Container>
  );
};

export default ProjectSubmission;
