export function avatarUrl(filename) {
  return filename ? `/uploads/avatars/${filename}` : null;
}
