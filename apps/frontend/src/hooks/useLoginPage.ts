// src/hooks/useLoginPage.ts
import React, { useState } from 'react';
import { useAuth } from './useAuth';
import { useNotification } from './useNotification';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import apiClient from '../api/apiClient';

export function useLoginPage() {
  const [userID, setUserID] = useState('');
  const { showNotification, notificationMessage, notificationType } = useNotification();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      // Gửi yêu cầu POST đến backend với mUserID (Số thẻ)
      const response = await apiClient.post('/auth/login', {
        mUserID: userID, // Backend mong đợi key là mUserID
      });
      
      // Backend trả về: { message, userData }
      const { userData } = response.data;
      
      // Tạo đối tượng user phù hợp với AuthContext
      const user = {
        userID: userID,
        userName: userData.UserName,
        role: 'admin' // Mặc định là user, nếu có logic phân quyền thì cập nhật sau
      };
      
      // 🔹 Initialize scale state khi login (lần đầu sẽ chưa có)
      if (!localStorage.getItem('scaleEnabled')) {
        localStorage.setItem('scaleEnabled', 'false');
        console.log('[LoginPage] Initialize scaleEnabled = false');
      }
      
      // Lưu thông tin vào AuthContext (không cần token)
      login(user, ''); // Token để trống vì backend không yêu cầu
      
      showNotification(`Chào mừng ${user.userName}!`, 'success');
      
      setTimeout(() => {
        navigate('/dashboard'); // Chuyển hướng đến dashboard sau khi đăng nhập thành công
      }, 1500);

    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // Hiển thị thông báo lỗi từ backend
        showNotification(error.response.data.message || 'Đã có lỗi xảy ra', 'error');
      } else {
        showNotification('Không thể kết nối đến server.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    setUserID,
    handleLogin,
    isLoading,
    notificationMessage,
    notificationType,
    userID,
  };
}