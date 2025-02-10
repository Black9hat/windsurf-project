/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import axios from 'axios';
import { FaSearch, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProjectCard from '../components/ProjectCard';

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #333;
  margin: 0;
`;

const ProfileName = styled.div`
  font-size: 1.1rem;
  color: var(--primary-color);
  margin-left: 1rem;
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #0056b3;
    transform: translateY(-2px);
  }

  svg {
    font-size: 1.2rem;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const SearchBar = styled.div`
  flex: 1;
  min-width: 300px;
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  svg {
    color: #666;
    margin-right: 0.5rem;
  }
  
  input {
    border: none;
    flex: 1;
    font-size: 1rem;
    outline: none;
    
    &::placeholder {
      color: #999;
    }
  }
`;

const Select = styled.select`
  padding: 0.5rem 2rem 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  font-size: 1rem;
  color: #333;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1em;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const ProjectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
  background: #f8f9fa;
  border-radius: 12px;
  
  h3 {
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }
  
  p {
    margin-bottom: 2rem;
    color: #888;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #007bff;
`;

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [category, setCategory] = useState('all');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let endpoint = '/api/projects';
      
      // If user is an innovator, only fetch their projects
      if (currentUser?.accountType === 'innovator') {
        endpoint = '/api/projects/my-projects';
      }

      const response = await axios.get(endpoint, {
        params: {
          sort: sortBy,
          category: category !== 'all' ? category : undefined,
          search: searchTerm || undefined
        }
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, category, searchTerm, currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSort = (e) => {
    setSortBy(e.target.value);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
  };

  const handleCreateProject = () => {
    navigate('/create-project');
  };

  const handleLike = async (projectId) => {
    try {
      await axios.post(`/api/projects/${projectId}/like`);
      fetchData();
    } catch (error) {
      console.error('Error liking project:', error);
    }
  };

  const handleShare = (projectId) => {
    const url = `${window.location.origin}/project/${projectId}`;
    navigator.clipboard.writeText(url);
    // You could add a toast notification here
  };

  const handleBuy = async (project) => {
    try {
      const response = await axios.post(`/api/projects/${project._id}/purchase`, {
        userId: currentUser.id
      });
      
      if (response.data.success) {
        navigate(`/checkout/${project._id}`);
      }
    } catch (error) {
      console.error('Error initiating purchase:', error);
    }
  };

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingSpinner>Loading projects...</LoadingSpinner>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <Header>
        <TitleSection>
          <Title>
            {currentUser?.accountType === 'innovator' ? 'My Projects' : 'Browse Projects'}
          </Title>
          <ProfileName>Welcome, {currentUser?.displayName || currentUser?.email}</ProfileName>
        </TitleSection>
        {currentUser?.accountType === 'innovator' && (
          <CreateButton onClick={handleCreateProject}>
            <FaPlus />
            Create Project
          </CreateButton>
        )}
      </Header>

      <Controls>
        <SearchBar>
          <FaSearch />
          <input
            type="text"
            placeholder={currentUser?.accountType === 'innovator' ? 
              "Search your projects..." : 
              "Search all projects..."}
            value={searchTerm}
            onChange={handleSearch}
          />
        </SearchBar>

        <Select value={sortBy} onChange={handleSort}>
          <option value="newest">Newest First</option>
          <option value="popular">Most Popular</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
        </Select>

        <Select value={category} onChange={handleCategoryChange}>
          <option value="all">All Categories</option>
          <option value="technology">Technology</option>
          <option value="design">Design</option>
          <option value="science">Science</option>
          <option value="engineering">Engineering</option>
          <option value="other">Other</option>
        </Select>
      </Controls>

      {projects.length === 0 ? (
        <EmptyState>
          <h3>
            {currentUser?.accountType === 'innovator' 
              ? 'No Projects Yet' 
              : 'No Projects Found'}
          </h3>
          <p>
            {currentUser?.accountType === 'innovator'
              ? 'Start creating your first project to showcase your innovation!'
              : 'Try adjusting your search or filters to find more projects.'}
          </p>
          {currentUser?.accountType === 'innovator' && (
            <CreateButton onClick={handleCreateProject}>
              <FaPlus />
              Create Your First Project
            </CreateButton>
          )}
        </EmptyState>
      ) : (
        <ProjectGrid>
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onLike={() => handleLike(project._id)}
              onShare={() => handleShare(project._id)}
              onBuy={() => handleBuy(project)}
              showActions={currentUser?.accountType === 'buyer'}
            />
          ))}
        </ProjectGrid>
      )}
    </DashboardContainer>
  );
};

export default Dashboard;
