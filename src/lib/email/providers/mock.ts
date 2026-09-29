import type { EmailProvider } from "../types";
import { nanoid } from "nanoid";

export const mockEmailProvider: EmailProvider = {
  name: "mock",
  async send(payload) {
    console.info("[email:mock]", payload.to, payload.subject);
    return { success: true, id: `email_${nanoid(8)}` };
  },
};
