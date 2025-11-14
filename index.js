const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events
} = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ========================= //
//   YORUM BUTONU FONKSİYON  //
// ========================= //
function createButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("yorumForm")
      .setLabel("Yorum Yap")
      .setStyle(ButtonStyle.Primary)
  );
}

function createMainEmbed() {
  return new EmbedBuilder()
    .setTitle("Yorum Yap!")
    .setDescription(
      "Yorum yaparak bize destek olmak ister misin?\n" +
      "Aşağıdaki butonla hemen yorumunu gönder!\n\n" +
      "https://tenor.com/view/thor-power-lightning-charged-up-lets-do-this-gif-17857010"
    )
    .setColor("Blue");
}

async function sendButton(channel) {
  await channel.send({
    embeds: [createMainEmbed()],
    components: [createButton()]
  });
}

// ========================= //
//         .yorum            //
// ========================= //
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (msg.content !== ".yorum") return;

  // sadece owner
  if (msg.author.id !== msg.guild.ownerId) {
    return msg.reply("Bu komutu sadece sunucu sahibi kullanabilir!");
  }

  const kanal = msg.guild.channels.cache.get(process.env.YORUM_KANAL);
  if (!kanal) return msg.reply("YORUM_KANAL ID yanlış!");

  await sendButton(kanal);
  msg.reply("Yorum sistemi kuruldu! 🔥");
});

// ========================= //
//       BUTON → FORM        //
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
    .setLabel("Kaç Yıldız? (1-5)")
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
    return i.reply({ content: "Kanal bulunamadı!", ephemeral: true });
  }

  // puan → ⚡
  const stars = "⚡".repeat(Math.min(Math.max(puan, 1), 5));

  // GIF seçimi
  const gif = puan <= 3
    ? "https://tenor.com/view/anime-gif-wolf-edgy-dark-gif-11303854337102397742"
    : "https://tenor.com/view/cat-catgame-cheer-cheering-dancing-gif-10148219265460740386";

  // eski butonları sil
  const msgs = await kanal.messages.fetch({ limit: 15 });
  msgs.forEach(m => {
    if (m.components.length > 0) {
      m.delete().catch(() => {});
    }
  });

  // yorum gönder
  const embed = new EmbedBuilder()
    .setTitle(`${i.user.username} yorum yaptı!`)
    .setDescription(
      `\`\`\`${yorum}\`\`\`\n` +
      `**Puan:**\n\`\`\`${stars}\`\`\`\n${gif}`
    )
    .setColor("Random");

  await kanal.send({ embeds: [embed] });

  // butonu en alta tekrar ekle
  await sendButton(kanal);

  await i.reply({ content: "Yorumun gönderildi!", ephemeral: true });
});

client.login(process.env.TOKEN);
