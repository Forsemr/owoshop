const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const ms = require("ms");
require("dotenv").config();

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
  const süreMS = ms(
    süre.replace("D", "d").replace("S", "h").replace("G", "m")
  );

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
    winners: kazananSayısı,
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

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`leave_${interaction.message.id}`)
        .setLabel("❌ Çekilişten Ayrıl")
        .setStyle(ButtonStyle.Danger)
    );

    interaction.reply({
      content: [
        `> 🎉 **Çekilişe katıldınız!**`,
        `> 💫 Kazanma şansınız: **1 / ${data.entrants.size}**`,
        `> 👥 Çekilişe Katılan kişi sayısı: **${data.entrants.size}**`,
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

  //////////////////////
  // YORUM SİSTEMİ
  //////////////////////
  if (interaction.customId === "make_review") {
    const modal = new ModalBuilder()
      .setCustomId("review_modal")
      .setTitle("Yorum Yap");

    const yorum = new TextInputBuilder()
      .setCustomId("yorum_text")
      .setLabel("Yorumunuz")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const yıldız = new TextInputBuilder()
      .setCustomId("yildiz_sayi")
      .setLabel("Kaç Yıldız? (1-5)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(yorum);
    const row2 = new ActionRowBuilder().addComponents(yıldız);
    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  }

  // MODAL GÖNDERİLDİĞİNDE
  if (interaction.isModalSubmit() && interaction.customId === "review_modal") {
    const yorum = interaction.fields.getTextInputValue("yorum_text");
    const yıldız = Math.max(
      1,
      Math.min(5, parseInt(interaction.fields.getTextInputValue("yildiz_sayi")) || 1)
    );
    const yıldızMetin = "⚡".repeat(yıldız);

    const kanal = interaction.guild.channels.cache.get(process.env.YORUM_KANAL);
    if (!kanal)
      return interaction.reply({
        content: "> Yorum kanalı bulunamadı!",
        ephemeral: true,
      });

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username} Bir Yorum Yaptı!`)
      .setDescription(`${yıldızMetin}\n${yorum}`)
      .setImage("https://media.tenor.com/TH8g8YapAMIAAAAC/thor.gif")
      .setFooter({ text: "RevalOWO Systems." })
      .setColor(null);

    await kanal.send({ embeds: [embed] });

    // yorum kanalı mesajını sıfırla
    const reviewEmbed = new EmbedBuilder()
      .setImage(
        "https://media.tenor.com/7_Xo_VZr7M8AAAAC/zay-flowers-baltimore-ravens-touchdown-playoffs.gif"
      )
      .setDescription(
        "Bizi Yorumlamak istermisin?\nAşağıdaki butona tıklayarak yorumunu bırak!"
      )
      .setColor(null);

    const reviewButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("make_review")
        .setLabel("Yorum Yap")
        .setStyle(ButtonStyle.Primary)
    );

    await kanal.send({ embeds: [reviewEmbed], components: [reviewButton] });

    // 🔧 Hata düzeltmesi: deferUpdate() + ayrı ephemeral yanıt
    await interaction.deferUpdate().catch(() => {});
    await interaction.followUp({
      content: "> ✅ Yorumun gönderildi!",
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

  const embed = new EmbedBuilder()
    .setImage(
      "https://media.tenor.com/7_Xo_VZr7M8AAAAC/zay-flowers-baltimore-ravens-touchdown-playoffs.gif"
    )
    .setDescription(
      "Bizi Yorumlamak istermisin?\nAşağıdaki butona tıklayarak yorumunu bırak!"
    )
    .setColor(null);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("make_review")
      .setLabel("Yorum Yap")
      .setStyle(ButtonStyle.Primary)
  );

  message.guild.channels.cache
    .get(process.env.YORUM_KANAL)
    ?.send({ embeds: [embed], components: [row] });
});
