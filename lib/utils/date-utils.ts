export const formatRelativeTime = (date: string): string => {
  const now = new Date();
  const diff = new Date(date).getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} يوم ${hours % 24} ساعة`;
  if (hours > 0) return `${hours} ساعة ${minutes % 60} دقيقة`;
  return `${minutes} دقيقة`;
};
