const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require("discord.js");
require("dotenv").config();

const ms = require("ms");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const giveawayData = new Map();

client.login(process.env.TOKEN);

client.once("ready", () => {
  console.log(`${client.user.tag} aktif!`);
});

//////////////////////
// .CK KOMUTU
//////////////////////
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(".ck") || message.author.bot) return;
  if (message.author.id !== message.guild.ownerId)
    return message.reply("Bu komutu sadece sunucu sahibi kullanabilir!");

  const args = message.content.split(" ").slice(1);
  const [süre, kazananSayısı, ...ödülArray] = args;
  if (!süre || !kazananSayısı || ödülArray.length === 0)
    return message.reply("Kullanım: `.ck <Süre> <Kazanan Sayısı> <Ödül>`");

  const ödül = ödülArray.join(" ");
  const süreMS = ms(süre.replace("D", "d").replace("S", "h").replace("G", "m"));
  if (!süreMS) return message.reply("Geçerli bir süre gir!");

  const embed = new EmbedBuilder()
    .setTitle("🎉 Çekiliş Başladı!")
    .setDescription(
      `**Ödül:** ${ödül}\n**Kazanan Sayısı:** ${kazananSayısı}\n**Süre:** ${süre}\n\nKatılmak için aşağıdaki butona tıkla!`
    )
    .setColor(null)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("join_giveaway")
      .setLabel("🎉 Katıl")
      .setStyle(ButtonStyle.Primary)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });

  giveawayData.set(msg.id, {
    entrants: new Set(),
    prize: ödül,
    winners: parseInt(kazananSayısı),
    endTime: Date.now() + süreMS,
  });

  // Süre bitince kazananları açıkla
  setTimeout(async () => {
    const data = giveawayData.get(msg.id);
    if (!data) return;
    const katilanlar = Array.from(data.entrants);
    if (katilanlar.length === 0)
      return message.channel.send(`Kimse çekilişe katılmadı!`);

    const winners = [];
    for (let i = 0; i < Math.min(katilanlar.length, data.winners); i++) {
      const winner =
        katilanlar.splice(Math.floor(Math.random() * katilanlar.length), 1)[0];
      winners.push(`<@${winner}>`);
    }

    const winEmbed = new EmbedBuilder()
      .setTitle("🎉 Çekiliş Bitti!")
      .setDescription(
        `**Ödül:** ${data.prize}\n**Kazanan(lar):** ${winners.join(", ")}`
      )
      .setColor(null);

    await message.channel.send({ embeds: [winEmbed] });
    giveawayData.delete(msg.id);
  }, süreMS);
});

//////////////////////
// BUTONLAR
//////////////////////
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  // ÇEKİLİŞ KATIL
  if (interaction.customId === "join_giveaway") {
    const data = giveawayData.get(interaction.message.id);
    if (!data)
      return interaction.reply({
        content: "> Bu çekiliş artık aktif değil.",
        ephemeral: true,
      });

    if (data.entrants.has(interaction.user.id)) {
      return interaction.reply({
        content: "> Zaten çekilişe katılmışsın.",
        ephemeral: true,
      });
    }

    data.entrants.add(interaction.user.id);

    const toplam = data.entrants.size;
    const kazananSayısı = data.winners;
    const sans = ((kazananSayısı / toplam) * 100).toFixed(2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`leave_${interaction.message.id}`)
        .setLabel("❌ Çekilişten Ayrıl")
        .setStyle(ButtonStyle.Danger)
    );

    interaction.reply({
      content: [
        `> 🎉 **Çekilişe katıldınız!**`,
        `> 💫 Kazanma şansınız: **%${sans}**`,
        `> 👥 Katılan kişi sayısı: **${toplam}**`,
        `> Çekilişten ayrılmak için aşağıdaki butona basınız.`,
      ].join("\n"),
      components: [row],
      ephemeral: true,
    });
  }

  // ÇEKİLİŞTEN AYRIL
  if (interaction.customId.startsWith("leave_")) {
    const id = interaction.customId.split("_")[1];
    const data = giveawayData.get(id);
    if (!data)
      return interaction.reply({
        content: "> Bu çekiliş artık aktif değil.",
        ephemeral: true,
      });

    data.entrants.delete(interaction.user.id);
    interaction.reply({
      content: "> ❌ Çekilişten ayrıldınız.",
      ephemeral: true,
    });
  }

  // YORUM BUTONU
  if (interaction.customId === "make_review") {
    const kanal = interaction.guild.channels.cache.get(process.env.YORUM_KANAL);
    if (!kanal)
      return interaction.reply({
        content: "> Yorum kanalı bulunamadı!",
        ephemeral: true,
      });

    const mesaj = [
      `> 🎉 **${interaction.user.username} Yorum Yapmak İstiyor!**`,
      `> Lütfen aşağıdaki mesajın altına yorumunuzu yazın.`,
      `> GIF: https://media.tenor.com/7_Xo_VZr7M8AAAAC/zay-flowers-baltimore-ravens-touchdown-playoffs.gif`
    ].join("\n");

    await kanal.send({ content: mesaj });
    await interaction.reply({
      content: "> ✅ Yorum mesajınız gönderildi!",
      ephemeral: true,
    });
  }
});

//////////////////////
// .YORUM KOMUTU
//////////////////////
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(".yorum") || message.author.bot) return;
  if (message.author.id !== message.guild.ownerId)
    return message.reply("Bu komutu sadece sunucu sahibi kullanabilir!");

  const kanal = message.guild.channels.cache.get(process.env.YORUM_KANAL);
  if (!kanal) return;

  const mesaj = [
    `> 🎉 **Bizi Yorumlamak İster misiniz?**`,
    `> Aşağıdaki butona tıklayarak yorumunuzu bırakabilirsiniz.`,
    `> GIF: https://media.tenor.com/7_Xo_VZr7M8AAAAC/zay-flowers-baltimore-ravens-touchdown-playoffs.gif`
  ].join("\n");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("make_review")
      .setLabel("Yorum Yap")
      .setStyle(ButtonStyle.Primary)
  );

  kanal.send({ content: mesaj, components: [row] });
});
