// ===== API 请求封装 =====
const API_BASE = '/api';

async function request(url, options = {}) {
  const config = {
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.headers = { 'Content-Type': 'application/json', ...(config.headers || {}) };
    config.body = JSON.stringify(config.body);
  } else if (config.method === 'POST' || config.method === 'PUT') {
    config.headers = { 'Content-Type': 'application/json', ...(config.headers || {}) };
  }
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

  // 统计
  getStats: () => request('/stats'),

  // 评论
  getPostComments: (postId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/comments/post/${postId}?${query}`);
  },
  createComment: (data) => request('/comments', { method: 'POST', body: data }),
  getComments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/comments?${query}`);
  },
  getComment: (id) => request(`/comments/${id}`),
  updateCommentStatus: (id, status) => request(`/comments/${id}/status`, { method: 'PUT', body: { status } }),
  replyComment: (id, reply_content) => request(`/comments/${id}/reply`, { method: 'PUT', body: { reply_content } }),
  deleteComment: (id) => request(`/comments/${id}`, { method: 'DELETE' }),
};
