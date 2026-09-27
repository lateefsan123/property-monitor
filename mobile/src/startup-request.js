// Bound startup reads without clearing a session or granting unverified access.
export async function withStartupTimeout(operation, message, milliseconds = 12000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
