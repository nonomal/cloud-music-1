import service from './request';
// 获取精品歌单
export function getTopPlayList({ cat = '全部', limit = 10, before = '' }) {
  return service.get(`/top/playlist/highquality?cat=${cat}&limit=${limit}&before=${before}`);
}
// 精品歌单标签列表
export function getTopPlayListTags() {
  return service.get('/playlist/highquality/tags');
}
// 推荐歌单
export function getPersonalized() {
  return service.get('/personalized?limit=15');
}
// 获取歌单详情
export function getPlaylistDetail(id: string) {
  return service.get(`/playlist/detail?id=${id}`);
}
// 获取歌单所有数据
export function getPlaylistAllDetail(data:{
  id: string,
  limit?: number,
  offset?: number,
}) {
  const qs = {
    ...data,
    timestamp: Date.now()
  };
  return service.get('/playlist/track/all?'+qs);
}