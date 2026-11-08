import type { NextConfig } from "next";

const config: NextConfig = {
  // nodemailer, imapflow and mailparser use Node APIs; keep them out of the bundle.
  serverExternalPackages: ["nodemailer", "imapflow", "mailparser"],
};

export default config;
