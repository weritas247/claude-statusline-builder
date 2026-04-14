import { userInfo } from "node:os";
export default {
  id: "user",
  label: "User",
  category: "Session",
  render() {
    try {
      const u = userInfo().username;
      return u ? { text: u } : null;
    } catch {
      return null;
    }
  },
};
