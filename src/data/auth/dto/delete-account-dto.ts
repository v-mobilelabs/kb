import { z } from "zod";

// No input fields — actor identity comes from WithContext
export const DeleteAccountSchema = z.object({});

export type DeleteAccountDto = z.infer<typeof DeleteAccountSchema>;
