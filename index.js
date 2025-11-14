const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require("discord.js");
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

function createYorumMesajEmbed() {
  return new EmbedBuilder()
    .setTitle("Yorum Yap!")
    .setDescription("Yorum yaparak bize destek olmak ister misin?\nAşağıdaki butona basarak yorumunu gönderebilirsin!")
    .setImage("https://raw.githubusercontent.com/Forsemr/owoshop/refs/heads/main/ChatGPT%20Image%2014%20Kas%202025%2021_09_19.png")
    .setColor("Random");
}

async function sendYorumButton(channel) {
  await channel.send({
    embeds: [createYorumMesajEmbed()],
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

  const msgs = await kanal.messages.fetch({ limit: 15 });
  msgs.forEach(m => {
    if (m.components.length > 0) m.delete().catch(() => {});
  });

  const messageText =
`>>> **${i.user.username} yorum yaptı!**
\`\`\`
${yorum}
\`\`\`

**Puan:**
\`\`\`${stars}\`\`\`
`;

  await kanal.send(messageText);

  const rolID = process.env.YORUM_ROL;
  try {
    const member = await kanal.guild.members.fetch(i.user.id);
    await member.roles.add(rolID).catch(() => {});
  } catch {}

  await sendYorumButton(kanal);

  await i.reply({ content: "✔️ Yorumun gönderildi!", ephemeral: true });
});

client.login(process.env.TOKEN);
