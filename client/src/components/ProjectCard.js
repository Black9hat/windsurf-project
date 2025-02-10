/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaStar, FaComment, FaTag, FaBookmark, FaHeart, FaShare, FaShoppingCart } from 'react-icons/fa';

const cardStyle = css`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
  }
`;

const CardActions = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
  z-index: 2;
`;

const actionButtonStyle = (active) => css`
  background: ${active ? '#007bff' : 'white'};
  color: ${active ? 'white' : '#666'};
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    background: ${active ? '#0056b3' : '#007bff'};
    color: white;
  }
`;

const BuyButton = styled.button`
  background: var(--success-color);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
  width: 100%;

  &:hover {
    background: #218838;
    transform: translateY(-2px);
  }

  svg {
    font-size: 1.2rem;
  }
`;

const imageContainerStyle = css`
  position: relative;
  height: 200px;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
  }
`;

const imageStyle = css`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  
  ${cardStyle}:hover & {
    transform: scale(1.05);
  }
`;

const Content = styled.div`
  padding: 1.5rem;
`;

const Title = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: #333;
`;

const Description = styled.p`
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.5;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const tagStyle = css`
  background: #f0f0f0;
  color: #666;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: #e0e0e0;
    transform: translateY(-2px);
  }
`;

const MetaInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #eee;
`;

const Price = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const PriceAmount = styled.span`
  font-size: 1.25rem;
  font-weight: bold;
  color: #007bff;
`;

const PriceLabel = styled.span`
  font-size: 0.8rem;
  color: #666;
`;

const Stats = styled.div`
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
`;

const statItemStyle = css`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  transition: color 0.3s ease;
  
  &:hover {
    color: #007bff;
  }
`;

const InnovatorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
`;

const InnovatorAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
`;

const InnovatorName = styled.span`
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
`;

const badgeStyle = (featured) => css`
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: ${featured ? '#ffd700' : '#007bff'};
  color: ${featured ? '#000' : '#fff'};
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 500;
  z-index: 2;
`;

const ProjectCard = ({ 
  project, 
  onLike, 
  onSave, 
  onShare,
  onBuy,
  showActions = true,
  isLiked = false,
  isSaved = false 
}) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(isLiked);
  const [saved, setSaved] = useState(isSaved);
  
  const {
    _id,
    title,
    description,
    price,
    images,
    tags,
    rating,
    reviewCount,
    innovator,
    featured,
    category
  } = project;

  const handleLike = (e) => {
    e.preventDefault();
    setLiked(!liked);
    onLike?.();
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(!saved);
    onSave?.();
  };

  const handleShare = (e) => {
    e.preventDefault();
    onShare?.();
  };

  const handleBuy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onBuy) {
      onBuy(project);
    } else {
      navigate(`/checkout/${_id}`);
    }
  };

  return (
    <div css={cardStyle}>
      {featured && <span css={badgeStyle(true)}>Featured</span>}
      {category && <span css={badgeStyle(false)}>{category}</span>}
      
      {showActions && (
        <CardActions>
          <button css={actionButtonStyle(liked)} onClick={handleLike} title="Like project">
            <FaHeart />
          </button>
          <button css={actionButtonStyle(saved)} onClick={handleSave} title="Save project">
            <FaBookmark />
          </button>
          <button css={actionButtonStyle(false)} onClick={handleShare} title="Share project">
            <FaShare />
          </button>
        </CardActions>
      )}

      <Link to={`/project/${_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div css={imageContainerStyle}>
          <img 
            css={imageStyle}
            src={images?.[0]?.url || 'https://via.placeholder.com/400x300'} 
            alt={title} 
          />
        </div>
        
        <Content>
          <Title>{title}</Title>
          <Description>{description?.substring(0, 100)}...</Description>
          
          <TagsContainer>
            {tags?.map((tag, index) => (
              <span key={index} css={tagStyle}>
                <FaTag size={12} />
                {tag}
              </span>
            ))}
          </TagsContainer>

          <MetaInfo>
            <Price>
              <PriceAmount>${price?.toFixed(2) || '0.00'}</PriceAmount>
              <PriceLabel>One-time purchase</PriceLabel>
              <BuyButton onClick={handleBuy}>
                <FaShoppingCart /> Buy Now
              </BuyButton>
            </Price>
            <Stats>
              <span css={statItemStyle} title="Rating">
                <FaStar color="#ffd700" />
                {rating?.toFixed(1) || '0.0'}
              </span>
              <span css={statItemStyle} title="Reviews">
                <FaComment />
                {reviewCount || 0}
              </span>
            </Stats>
          </MetaInfo>

          <InnovatorInfo>
            <InnovatorAvatar 
              src={innovator?.avatar || 'https://via.placeholder.com/32'} 
              alt={innovator?.name} 
            />
            <InnovatorName>By {innovator?.name || 'Unknown'}</InnovatorName>
          </InnovatorInfo>
        </Content>
      </Link>
    </div>
  );
};

export default ProjectCard;
