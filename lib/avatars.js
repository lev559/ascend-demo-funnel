// Coach avatars: Notionists by Zoish (CC0 1.0, via DiceBear), composed per coach in scripts/make_avatars.js.
// Files live in public/avatars/<id>.svg (and 512px PNG for ads and the case page).
export const avatarSrc = (id) => `/avatars/${['nora', 'ines', 'max', 'theo'].includes(id) ? id : 'theo'}.svg`;
