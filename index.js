const { 
  Client, 
  GatewayIntentBits, 
  PermissionsBitField, 
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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// ---- YORUM BUTONU OLUŞTURMA ----
function createYorumButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("yorumForm")
      .setLabel("Yorum Yap")
      .setStyle(ButtonStyle.Primary)
  );
}

// ---- YORUM BUTON EMOJİLİ MESAJI ----
function createYorumMesaj() {
  return new EmbedBuilder()
    .setTitle("Yorum Yap!")
    .setDescription(
      "Yorum Yaparak Bize Destek Olmak İster misin?\n" +
      "Aşağıdaki butonla hemen yorumunu bırak! 🔥\n\n" +
      "https://tenor.com/view/thor-power-lightning-charged-up-lets-do-this-gif-17857010"
    )
    .setColor("Blue");
}

// ---- YORUM MESAJI ATMA ----
async function sendYorumButton(channel) {
  await channel.send({
    embeds: [createYorumMesaj()],
    components: [createYorumButton()]
  });
}

// ---- KOMUT .yorum ----
client.on("messageCreate", async (msg) => {
  if (msg.content !== ".yorum") return;
  if (msg.author.id !== msg.guild.ownerId) {
    return msg.reply("🛑 Bu komutu sadece sunucu sahibi kullanabilir!");
  }

  const kanal = msg.guild.channels.cache.get(process.env.YORUM_KANAL);
  if (!kanal) return msg.reply("Kanal bulunamadı!");

  await sendYorumButton(kanal);
  msg.reply("Yorum sistemi kuruldu! 🔥");
});

// ---- BUTON BASILDIĞINDA FORM ----
client.on(Events.InteractionCreate, async (i) => {
  if (!i.isButton()) return;
  if (i.customId !== "yorumForm") return;

  const modal = new ModalBuilder()
    .setCustomId("yorumModal")
    .setTitle("Yorum Formu");

  const yorum = new TextInputBuilder()
    .setCustomId("yorumText")
    .setLabel("1) Yorumunuz")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const puan = new TextInputBuilder()
    .setCustomId("puanText")
    .setLabel("2) Kaç Yıldız Veriyorsunuz? (1-5)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const row1 = new ActionRowBuilder().addComponents(yorum);
  const row2 = new ActionRowBuilder().addComponents(puan);

  modal.addComponents(row1, row2);

  await i.showModal(modal);
});

// ---- FORM GÖNDERİLDİĞİNDE ----
client.on(Events.InteractionCreate, async (i) => {
  if (!i.isModalSubmit()) return;
  if (i.customId !== "yorumModal") return;

  const yorum = i.fields.getTextInputValue("yorumText");
  const puan = Number(i.fields.getTextInputValue("puanText"));
  const kanal = i.guild.channels.cache.get(process.env.YORUM_KANAL);

  if (!kanal) return;

  // yıldız → ⚡ simgesiyle
  const yıldız = "⚡".repeat(Math.min(Math.max(puan, 1), 5));

  // uygun GIF
  let gif;
  if (puan <= 3) {
    gif = "https://tenor.com/view/anime-gif-wolf-edgy-dark-gif-11303854337102397742";
  } else {
    gif = "https://tenor.com/view/cat-catgame-cheer-cheering-dancing-gif-10148219265460740386";
  }

  // önce eski butonları sil
  const msgs = await kanal.messages.fetch({ limit: 10 });
  msgs.forEach(async (m) => {
    if (m.components.length > 0) m.delete().catch(() => {});
  });

  // yorum embed
  const embed = new EmbedBuilder()
    .setTitle(`${i.user.username} Yorum Yaptı!`)
    .setDescription(`\`\`\`${yorum}\`\`\`\n\n**Puan:**\n\`\`\`${yıldız}\`\`\`\n${gif}`)
    .setColor("Random")
    .setTimestamp();

  await kanal.send({ embeds: [embed] });

  // butonu tekrar alta ekle
  await sendYorumButton(kanal);

  await i.reply({ content: "Yorumun gönderildi! 💙", ephemeral: true });
});

client.login(process.env.TOKEN);
