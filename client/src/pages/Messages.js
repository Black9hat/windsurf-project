import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from '@emotion/styled';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';

const MessagesContainer = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1rem;
  height: calc(100vh - 200px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ChatList = styled.div`
  border-right: 1px solid #ddd;
  overflow-y: auto;
`;

const ChatItem = styled.div`
  padding: 1rem;
  cursor: pointer;
  background: ${props => props.active ? '#f0f7ff' : 'white'};
  border-bottom: 1px solid #ddd;
  &:hover {
    background: #f8f9fa;
  }
`;

const ChatName = styled.div`
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const LastMessage = styled.div`
  font-size: 0.9rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChatWindow = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ChatHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  font-weight: 500;
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Message = styled.div`
  max-width: 70%;
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  background: ${props => props.sent ? '#007bff' : '#f0f0f0'};
  color: ${props => props.sent ? 'white' : 'black'};
  align-self: ${props => props.sent ? 'flex-end' : 'flex-start'};
`;

const MessageTime = styled.div`
  font-size: 0.8rem;
  color: ${props => props.sent ? 'rgba(255,255,255,0.8)' : '#666'};
  margin-top: 0.25rem;
`;

const MessageForm = styled.form`
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid #ddd;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const SendButton = styled.button`
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #0056b3;
  }
`;

const Messages = () => {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const socket = useRef();
  const messageListRef = useRef();

  const handleNewMessage = useCallback((message) => {
    if (message.chat === activeChat?._id) {
      setMessages(prev => [...prev, message]);
    }
  }, [activeChat]);

  useEffect(() => {
    fetchChats();
    
    // Connect to Socket.IO
    socket.current = io('http://localhost:5000');
    
    socket.current.on('message', handleNewMessage);
    
    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current.off('message', handleNewMessage);
      }
    };
  }, [handleNewMessage]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat._id);
    }
  }, [activeChat]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChats = async () => {
    try {
      const response = await axios.get('/api/chats');
      setChats(response.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await axios.get(`/api/chats/${chatId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    try {
      const response = await axios.post(`/api/chats/${activeChat._id}/messages`, {
        content: newMessage
      });
      
      socket.current.emit('message', response.data);
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <MessagesContainer>
      <ChatList>
        {chats.map(chat => (
          <ChatItem
            key={chat._id}
            active={chat._id === activeChat?._id}
            onClick={() => setActiveChat(chat)}
          >
            <ChatName>
              {chat.participants.find(p => p._id !== currentUser._id).name}
            </ChatName>
            <LastMessage>
              {chat.lastMessage?.content || 'No messages yet'}
            </LastMessage>
          </ChatItem>
        ))}
      </ChatList>

      {activeChat ? (
        <ChatWindow>
          <ChatHeader>
            {activeChat.participants.find(p => p._id !== currentUser._id).name}
          </ChatHeader>
          
          <MessageList ref={messageListRef}>
            {messages.map(message => (
              <Message
                key={message._id}
                sent={message.sender === currentUser._id}
              >
                {message.content}
                <MessageTime sent={message.sender === currentUser._id}>
                  {new Date(message.createdAt).toLocaleTimeString()}
                </MessageTime>
              </Message>
            ))}
          </MessageList>

          <MessageForm onSubmit={sendMessage}>
            <MessageInput
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <SendButton type="submit">Send</SendButton>
          </MessageForm>
        </ChatWindow>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          Select a chat to start messaging
        </div>
      )}
    </MessagesContainer>
  );
};

export default Messages;
