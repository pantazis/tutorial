export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

export class LocalMailSink implements MailTransport {
  async send(message: MailMessage): Promise<void> {
    if (process.env.APP_ENV === "production") {
      throw new Error("The local mail sink is not a production mail provider.");
    }

    console.info(JSON.stringify({ event: "local_mail", to: message.to, subject: message.subject }));
  }
}
