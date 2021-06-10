export const patch = (object, data) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const key in data) {
    // eslint-disable-next-line no-prototype-builtins
    if (object.hasOwnProperty(key)) {
      object[key] = data[key];
    }
  }
  return object;
};

export const waitUntil = (condition) => new Promise((resolve) => {
  const interval = setInterval(() => {
    console.log(condition);
    if (condition) {
      resolve(true);
      clearInterval(interval);
    }
  }, 1000);
});

export const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const canMove = (player) => {
  if (player.movement > 0
    && !player.fuel
    && !player.redLight
    && !player.accident
    && !player.crevaison) {
    return true;
  }
  return false;
};
