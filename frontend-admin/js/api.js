// ===== API 请求封装 =====
const API_BASE = '/api';

async function request(url, options = {}) {
  const config = {
    ...options,
  };
  const headers = { ...(options.headers || {}) };
  // 自动携带登录 token（如果存在）
  try {
    const token = (typeof getToken === 'function') ? getToken() : '';
    if (token && !headers['Authorization']) {
      headers['Authorization'] = 'Bearer ' + token;
    }
  } catch (e) { /* ignore */ }
  if (config.body && typeof config.body === 'object') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    config.body = JSON.stringify(config.body);
  } else if (config.method === 'POST' || config.method === 'PUT') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  config.headers = headers;
  let response;
  try {
    response = await fetch(API_BASE + url, config);
  } catch (error) {
    throw new Error('网络连接失败，请检查服务是否启动');
  }
  let data;
  try {
    data = await response.json();
  } catch (e) {
    if (response.ok) {
      return { code: 200, message: '操作成功' };
    }
    throw new Error('服务器响应异常 (' + response.status + ')');
  }
  if (!response.ok) {
    throw new Error(data.message || '请求失败');
  }
  return data;
}

const api = {
  // 文章
  getPosts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/posts?${query}`);
  },
  getPost: (id) => request(`/posts/${id}`),
  createPost: (data) => request('/posts', { method: 'POST', body: data }),
  updatePost: (id, data) => request(`/posts/${id}`, { method: 'PUT', body: data }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  getCategories: () => request('/posts/categories'),

  // 个人资料
  getProfiles: () => request('/profiles'),
  getProfile: (id) => request(`/profiles/${id}`),
  createProfile: (data) => request('/profiles', { method: 'POST', body: data }),
  updateProfile: (id, data) => request(`/profiles/${id}`, { method: 'PUT', body: data }),
  deleteProfile: (id) => request(`/profiles/${id}`, { method: 'DELETE' }),

  // 评论
  getPostComments: (postId) => request(`/comments/post/${postId}`),
  createComment: (data) => request('/comments', { method: 'POST', body: data }),
  getComments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/comments?${query}`);
  },
  getCommentStats: () => request('/comments/stats'),
  updateCommentStatus: (id, status) => request(`/comments/${id}/status`, { method: 'PUT', body: { status } }),
  replyComment: (id, data) => request(`/comments/${id}/reply`, { method: 'POST', body: data }),
  deleteComment: (id) => request(`/comments/${id}`, { method: 'DELETE' }),

  // 统计
  getStats: () => request('/stats'),
};
