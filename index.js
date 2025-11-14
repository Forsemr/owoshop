const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ========================= //
//    BUTONLU METİN MESAJI   //
// ========================= //

function createYorumMesajText() {
  return `>>> **Yorum Yap!**
Yorum yaparak bize destek olmak ister misin?
Aşağıdaki butona basarak yorumunu gönderebilirsin!

https://ci3.googleusercontent.com/mail-img-att/AGAZnRolQOgg-ETFH7CKhvMt_ulw7WeDCHIvVtULaNWPq2UkCawM0RgB-xhvgSdcpxDU7-6YXlBcW505I5DZUfYhrl1B-7c7dryqrGT2Ks59hgZ8uMevukQDe0yb_cejVp8kqR0jDMvwxh9Nw4I01tWPT1tWrvZ7dlXsLk2Fcb7XuuDxKm1VQwsfwr-7P-5OZHfcSbdlP9g4vhschCPYOpgcFTcDnGnG7MWrCMBbWQ0hQBwxL7j5CeniHCeHSKZ_3QfEo7ZDeu35VnUFkYvtXDg1v0_CyFHQGO6PVStfPyteGzaPggV0_Mv4-XTPjDh9GtaBDNsNn_zNP-Hj0YnU4L702pHqT4tnirNI0sXO2-WUA3PPQJayZVcibiYIpMJ3B4UXWUy2FScJdGRcxSAmM2PbNp8J6udDzYdeN2jvzpJj66UnPXd3o_NzsPDse0TYOKbIy_O5OQv9wgQpRc-dqoIMMNdvvRCzXk3oFgUupVE_oligpxTrfBLfigJ-CRiUiCyyao33_1hl0cw-XEjrJRR4sqxvl_vg85RjB6tHmCaOBmgS3TIxPRkvJDwfBNbn10w_A_QJ2D4BYoKPhBu0abFSPRtWNa098E5hEk41s6znMOiVZ-NJH8Qmb76oJywiB0hyWmLifwyvbPauW1XNG8Z8XhOVb7X9BQyWtLC5wUSIsFtuQz0eRPqzmEME3sZY-iWi09ec-fDl_rBfJbpmpWKJfyvIIp_7qDQMc33uOjE3Mp6S03IoKhpx7tSU2t7Sme0VXJDu-7pLBsmTX_Lf5MNWcDX6HX5lnuyNoie5IrWICS7OJo3K9IXC45R4gt7QiubNcP09woODyqgnMc720Hctnlc7ZaYEOuZD9boI5yTwbE2d1sk67NHr9XmAYm94PgvLLy7ay_STxnjeM-i_k1hhULxcURYonnHrDAIQ-RkNd2L2vYqr3cr-ijVfUwAZJd825zOmM6yF-kgsjPDYNEID341wtMyY0mHSNQ68xryFAg53VaWZ2DLP8QTVs6wgyLSF3xe5cloDhZuuIp0hKzrvsv76GX54rEZGtgmGYluNf0IfBZftuA=s0-l75-ft
`;
}

async function sendYorumButton(channel) {
  await channel.send({
    content: createYorumMesajText(),
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("yorumForm")
          .setLabel("Yorum Yap")
          .setStyle(ButtonStyle.Primary)
      )
    ]
  });
}

// ========================= //
//         .yorum KOMUTU     //
// ========================= //

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (msg.content !== ".yorum") return;

  // sadece sunucu sahibi
  if (msg.author.id !== msg.guild.ownerId) {
    return msg.reply("🛑 Bu komutu sadece sunucu sahibi kullanabilir!");
  }

  const kanal = msg.guild.channels.cache.get(process.env.YORUM_KANAL);
  if (!kanal) return msg.reply("❌ YORUM_KANAL ID yanlış!");

  await sendYorumButton(kanal);
  msg.reply("✨ Yorum sistemi kuruldu!");
});

// ========================= //
//      BUTON → FORM         //
// ========================= //

client.on(Events.InteractionCreate, async (i) => {
  if (!i.isButton()) return;
  if (i.customId !== "yorumForm") return;

  const modal = new ModalBuilder()
    .setCustomId("yorumModal")
    .setTitle("Yorum Formu");

  const yorum = new TextInputBuilder()
    .setCustomId("yorumText")
    .setLabel("Yorumunuz")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const puan = new TextInputBuilder()
    .setCustomId("puanText")
    .setLabel("Kaç Yıldız Veriyorsunuz? (1-5)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(yorum),
    new ActionRowBuilder().addComponents(puan)
  );

  await i.showModal(modal);
});

// ========================= //
//     FORM → YORUM ATMA     //
// ========================= //

client.on(Events.InteractionCreate, async (i) => {
  if (!i.isModalSubmit()) return;
  if (i.customId !== "yorumModal") return;

  const yorum = i.fields.getTextInputValue("yorumText");
  const puan = Number(i.fields.getTextInputValue("puanText"));
  const kanal = i.guild.channels.cache.get(process.env.YORUM_KANAL);

  if (!kanal) {
    return i.reply({ content: "❌ Kanal bulunamadı!", ephemeral: true });
  }

  const stars = "⚡".repeat(Math.min(Math.max(puan, 1), 5));

  // eski butonu sil
  const msgs = await kanal.messages.fetch({ limit: 15 });
  msgs.forEach(m => {
    if (m.components.length > 0) m.delete().catch(() => {});
  });

  // ALINTI FORMATLI YORUM
  const messageText =
`>>> **${i.user.username} yorum yaptı!**
\`\`\`
${yorum}
\`\`\`

**Puan:**
\`\`\`${stars}\`\`\`
`;

  await kanal.send(messageText);

  // ◀▶ YORUM ROLÜ VER
  const rolID = process.env.YORUM_ROL;
  try {
    const member = await kanal.guild.members.fetch(i.user.id);
    await member.roles.add(rolID).catch(() => {});
  } catch {}

  // butonu tekrar en alta ekle
  await sendYorumButton(kanal);

  await i.reply({ content: "✔️ Yorumun gönderildi!", ephemeral: true });
});

client.login(process.env.TOKEN);
