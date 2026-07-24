// Generate and persist stable userId
export const getUserId = (): string => {
  let userId = localStorage.getItem('userId');
  
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('userId', userId);
    console.log('[userId] Generated NEW userId:', userId);
  } else {
    console.log('[userId] Retrieved EXISTING userId:', userId);
  }
  
  return userId;
};

export const clearUserId = (): void => {
  localStorage.removeItem('userId');
};

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('deviceId');

  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', deviceId);
  }

  return deviceId;
};
