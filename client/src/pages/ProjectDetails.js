import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
`;

const ProjectHeader = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #333;
  margin-bottom: 1rem;
`;

const ImageGallery = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Image = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
`;

const ProjectInfo = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
`;

const Description = styled.div`
  color: #666;
  line-height: 1.6;
`;

const Sidebar = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: fit-content;
`;

const Price = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 1rem;
`;

const Button = styled.button`
  width: 100%;
  background: ${props => props.secondary ? 'white' : '#007bff'};
  color: ${props => props.secondary ? '#007bff' : 'white'};
  border: ${props => props.secondary ? '1px solid #007bff' : 'none'};
  padding: 0.8rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 1rem;
  &:hover {
    background: ${props => props.secondary ? '#f8f9fa' : '#0056b3'};
  }
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const InnovatorInfo = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #ddd;
`;

const InnovatorName = styled.h3`
  color: #333;
  margin-bottom: 0.5rem;
`;

const ReviewsSection = styled.div`
  margin-top: 3rem;
`;

const Review = styled.div`
  background: white;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const ReviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const Stars = styled.div`
  color: #ffd700;
`;

const ProjectDetails = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handlePurchase = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setPurchasing(true);

    try {
      const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
      
      const response = await axios.post(`/api/payments/create-intent`, {
        projectId: project._id
      });

      const result = await stripe.redirectToCheckout({
        sessionId: response.data.sessionId
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Error initiating purchase:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleContact = async () => {
    try {
      const response = await axios.post('/api/chats', {
        participantId: project.innovator._id
      });
      navigate('/messages', { state: { chatId: response.data._id } });
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <Container>
      <ProjectHeader>
        <Title>{project.title}</Title>
      </ProjectHeader>

      <ImageGallery>
        {project.images.map((image, index) => (
          <Image key={index} src={image} alt={`Project image ${index + 1}`} />
        ))}
      </ImageGallery>

      <ProjectInfo>
        <Description>
          <h2>About this project</h2>
          <p>{project.description}</p>

          <ReviewsSection>
            <h2>Reviews</h2>
            {project.reviews.map(review => (
              <Review key={review._id}>
                <ReviewHeader>
                  <strong>{review.user.name}</strong>
                  <Stars>{'★'.repeat(review.rating)}</Stars>
                </ReviewHeader>
                <p>{review.comment}</p>
              </Review>
            ))}
          </ReviewsSection>
        </Description>

        <Sidebar>
          <Price>${project.price.toFixed(2)}</Price>
          <Button
            onClick={handlePurchase}
            disabled={purchasing || currentUser?._id === project.innovator._id}
          >
            {purchasing ? 'Processing...' : 'Purchase Now'}
          </Button>
          <Button
            secondary
            onClick={handleContact}
            disabled={!currentUser || currentUser._id === project.innovator._id}
          >
            Contact Innovator
          </Button>

          <InnovatorInfo>
            <InnovatorName>{project.innovator.name}</InnovatorName>
            <p>{project.innovator.bio || 'No bio available'}</p>
          </InnovatorInfo>
        </Sidebar>
      </ProjectInfo>
    </Container>
  );
};

export default ProjectDetails;
