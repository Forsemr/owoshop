const { 
  Client, GatewayIntentBits, EmbedBuilder, 
  ActionRowBuilder, ButtonBuilder, ButtonStyle, 
  Events, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require("discord.js");
require("dotenv").config();
const ms = require("ms");

const giveawayData = new Map();

//////////////////////
// .CK KOMUTU
//////////////////////
const setupCK = (client) => {
  client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(".ck") || message.author.bot) return;
    if (message.author.id !== message.guild.ownerId)
      return message.reply("Bu komutu sadece sunucu sahibi kullanabilir!");

    const args = message.content.split(" ").slice(1);
    const [süre, kazananSayısı, ...ödülArray] = args;
    if (!süre || !kazananSayısı || ödülArray.length === 0)
      return message.reply("Kullanım: `.ck <Süre> <Kazanan Sayısı> <Ödül>`");

    const ödül = ödülArray.join(" ");
    const süreMS = ms(süre.replace("D","d").replace("S","h").replace("G","m"));
    if (!süreMS) return message.reply("Geçerli bir süre gir!");

    const embed = new EmbedBuilder()
      .setTitle("🎉 Çekiliş Başladı!")
      .setDescription(`**Ödül:** ${ödül}\n**Kazanan Sayısı:** ${kazananSayısı}\n**Süre:** ${süre}\n\nKatılmak için aşağıdaki butona tıkla!`)
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
      endTime: Date.now() + süreMS
    });

    setTimeout(async () => {
      const data = giveawayData.get(msg.id);
      if (!data) return;
      const katilanlar = Array.from(data.entrants);
      if (katilanlar.length === 0) return message.channel.send(`Kimse çekilişe katılmadı!`);

      const winners = [];
      for (let i = 0; i < Math.min(katilanlar.length, data.winners); i++) {
        const winner = katilanlar.splice(Math.floor(Math.random()*katilanlar.length),1)[0];
        winners.push(`<@${winner}>`);
      }

      const winEmbed = new EmbedBuilder()
        .setTitle("🎉 Çekiliş Bitti!")
        .setDescription(`**Ödül:** ${data.prize}\n**Kazanan(lar):** ${winners.join(", ")}`)
        .setColor(null);

      await message.channel.send({ embeds: [winEmbed] });
      giveawayData.delete(msg.id);
    }, süreMS);
  });
};

//////////////////////
// BUTONLAR & INTERACTIONS
//////////////////////
const setupButtons = (client) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // ÇEKİLİŞ KATIL
    if (interaction.isButton() && interaction.customId === "join_giveaway") {
      const data = giveawayData.get(interaction.message.id);
      if (!data) return interaction.reply({ content: "> Bu çekiliş artık aktif değil.", ephemeral: true });

      if (data.entrants.has(interaction.user.id)) 
        return interaction.reply({ content: "> Zaten çekilişe katılmışsın.", ephemeral: true });

      data.entrants.add(interaction.user.id);
      const toplam = data.entrants.size;
      const kazananSayısı = data.winners;
      const sans = ((kazananSayısı / toplam)*100).toFixed(2);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`leave_${interaction.message.id}`)
          .setLabel("❌ Çekilişten Ayrıl")
          .setStyle(ButtonStyle.Danger)
      );

      const alinti = [
        `> 🎉 **Çekilişe katıldınız!**`,
        `> 💫 Kazanma şansınız: **%${sans}**`,
        `> 👥 Katılan kişi sayısı: **${toplam}**`,
        `> Çekilişten ayrılmak için aşağıdaki butona basınız.`
      ].join("\n");

      interaction.reply({ content: alinti, components: [row], ephemeral: true });
    }

    // ÇEKİLİŞTEN AYRIL
    if (interaction.isButton() && interaction.customId.startsWith("leave_")) {
      const id = interaction.customId.split("_")[1];
      const data = giveawayData.get(id);
      if (!data) return interaction.reply({ content: "> Bu çekiliş artık aktif değil.", ephemeral: true });

      data.entrants.delete(interaction.user.id);
      interaction.reply({ content: "> ❌ Çekilişten ayrıldınız.", ephemeral: true });
    }

    // YORUM BUTONU: Modal aç
    if (interaction.isButton() && interaction.customId === "make_review") {
      const modal = new ModalBuilder()
        .setCustomId("review_modal")
        .setTitle("Yorum Yap");

      const yorumInput = new TextInputBuilder()
        .setCustomId("yorum_text")
        .setLabel("Yorumunuz")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const starsInput = new TextInputBuilder()
        .setCustomId("yorum_stars")
        .setLabel("Kaç Yıldız? (1-5)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const row1 = new ActionRowBuilder().addComponents(yorumInput);
      const row2 = new ActionRowBuilder().addComponents(starsInput);
      modal.addComponents(row1, row2);

      await interaction.showModal(modal);
    }

    // Modal Submit
    if (interaction.isModalSubmit() && interaction.customId === "review_modal") {
      const yorum = interaction.fields.getTextInputValue("yorum_text");
      const stars = parseInt(interaction.fields.getTextInputValue("yorum_stars"));
      const kanal = interaction.guild.channels.cache.get(process.env.YORUM_KANAL);
      if (!kanal) return interaction.reply({ content: "> Yorum kanalı bulunamadı!", ephemeral: true });

      // Önceki yorum buton mesajını sil
      kanal.messages.fetch({ limit: 10 }).then(msgs => {
        const eskiButon = msgs.find(m => m.components.length > 0);
        if (eskiButon) eskiButon.delete().catch(() => {});
      });

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username} Bir Yorum Yaptı!`)
        .setDescription(yorum)
        .addFields({ name: "⭐ Yıldızlar", value: "⚡".repeat(stars) })
        .setImage("https://media.tenor.com/21643627AAAAC/thor-gif.gif")
        .setColor(null)
        .setFooter({ text: "RevalOWO Systems." });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("make_review")
          .setLabel("Yorum Yap")
          .setStyle(ButtonStyle.Primary)
      );

      await kanal.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: "> ✅ Yorumunuz gönderildi!", ephemeral: true });
    }
  });
};

//////////////////////
// .YORUM KOMUTU
//////////////////////
const setupYorum = (client) => {
  client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(".yorum") || message.author.bot) return;
    if (message.author.id !== message.guild.ownerId) return message.reply("Bu komutu sadece sunucu sahibi kullanabilir!");

    const kanal = message.guild.channels.cache.get(process.env.YORUM_KANAL);
    if (!kanal) return;

    const embed = new EmbedBuilder()
      .setTitle("🎉 Bizi Yorumlamak İster misiniz?")
      .setDescription("> Hemen aşağıdaki butona tıklayarak yorumunuzu bırakabilirsiniz!")
      .setImage("https://media.tenor.com/7_Xo_VZr7M8AAAAC/zay-flowers-baltimore-ravens-touchdown-playoffs.gif")
      .setColor(null)
      .setFooter({ text: "RevalOWO Systems." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("make_review")
        .setLabel("Yorum Yap")
        .setStyle(ButtonStyle.Primary)
    );

    kanal.send({ embeds: [embed], components: [row] });
  });
};

//////////////////////
// BOT LOGIN
//////////////////////
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

setupCK(client);
setupButtons(client);
setupYorum(client);

client.login(process.env.TOKEN);
