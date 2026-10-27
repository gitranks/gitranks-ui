/** A login from a URL segment; a malformed escape is left as it is (GitHub logins are plain ASCII anyway). */
export const loginFromPath = (login: string) => {
  try {
    return decodeURIComponent(login);
  } catch {
    return login;
  }
};
