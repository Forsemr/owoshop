// index.js
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel]
});

const yorumKanaliID = process.env.YORUM_KANALI; // Yorum kanalı ID
const PREFIX_CEKILIS = '.ck';
const PREFIX_YORUM = '.yorum';

// Geçici veri saklama
let cekilisler = {}; // { messageId: {odul, kazananSayisi, katilan: []} }

client.on('ready', () => {
    console.log(`${client.user.tag} giriş yaptı!`);
});

client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;
    if (message.author.id !== message.guild.ownerId) return; // Sadece sunucu sahibi

    // ------------------ Çekiliş Başlat ------------------
    if (message.content.startsWith(PREFIX_CEKILIS)) {
        const args = message.content.slice(PREFIX_CEKILIS.length).trim().split(' ');
        if (args.length < 3) return message.reply('Doğru kullanım: `.ck Süre(d/g/s) KazananSayısı Ödül`');

        const sure = args[0]; // Örn: 5d, 10h, 30m
        const kazananSayisi = parseInt(args[1]);
        const odul = args.slice(2).join(' ');

        const embed = new EmbedBuilder()
            .setTitle('🎉 ÇEKİLİŞ BAŞLADI!')
            .setDescription(`Ödül: ${odul}\nKazanan Sayısı: ${kazananSayisi}\nSüre: ${sure}`)
            .setColor('Blurple');

        const buton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cekilis_katil')
                .setLabel('🎉 Katıl')
                .setStyle(ButtonStyle.Primary)
        );

        const sentMessage = await message.channel.send({ embeds: [embed], components: [buton] });
        cekilisler[sentMessage.id] = { odul, kazananSayisi, katilan: [] };

        return;
    }

    // ------------------ Yorum Başlat ------------------
    if (message.content.startsWith(PREFIX_YORUM)) {
        const embed = new EmbedBuilder()
            .setTitle('Bizi Yorumlamak İster misin?')
            .setDescription('💬 Alıntıdan yorum yapabilirsiniz!')
            .setImage('https://media.tenor.com/0fJtnAKh7bwAAAAC/zay-flowers-baltimore-ravens-touchdown.gif') // GIF direkt alıntı
            .setColor('Blurple');

        const buton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('yorum_yap')
                .setLabel('Yorum Yap')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [buton] });
        return;
    }
});

// ------------------ Buton Etkileşimleri ------------------
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // ------------------ Çekilişe Katıl ------------------
    if (interaction.customId === 'cekilis_katil') {
        const cekilis = cekilisler[interaction.message.id];
        if (!cekilis) return interaction.reply({ content: 'Bu çekiliş artık geçersiz.', ephemeral: true });

        if (cekilis.katilan.includes(interaction.user.id))
            return interaction.reply({ content: 'Zaten çekilişe katıldınız!', ephemeral: true });

        cekilis.katilan.push(interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle('Çekilişe Katıldınız!')
            .setDescription(`Kazanma Şansınız: ${cekilis.kazananSayisi}\nÇekilişe Katılan Kişi Sayısı: ${cekilis.katilan.length}`)
            .setColor('Blurple');

        const ayrilButon = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`cekilis_ayril_${interaction.message.id}`)
                .setLabel('❌ Çekilişten Ayrıl')
                .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({ embeds: [embed], components: [ayrilButon], ephemeral: true });
    }

    // ------------------ Çekilişten Ayrıl ------------------
    if (interaction.customId.startsWith('cekilis_ayril_')) {
        const msgId = interaction.customId.split('_')[2];
        const cekilis = cekilisler[msgId];
        if (!cekilis) return interaction.reply({ content: 'Bu çekiliş artık geçersiz.', ephemeral: true });

        const index = cekilis.katilan.indexOf(interaction.user.id);
        if (index !== -1) cekilis.katilan.splice(index, 1);

        return interaction.update({
            content: `!     A\n!     A\n!     A\n!     A\n!     A`,
            embeds: [],
            components: []
        });
    }

    // ------------------ Yorum Yap ------------------
    if (interaction.customId === 'yorum_yap') {
        const modal = new ModalBuilder()
            .setCustomId('yorum_modal')
            .setTitle('Yorum Yap');

        const yorumInput = new TextInputBuilder()
            .setCustomId('yorum_text')
            .setLabel('Yorumunuz')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const yildizInput = new TextInputBuilder()
            .setCustomId('yorum_yildiz')
            .setLabel('Kaç Yıldız? (1-5)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(yorumInput);
        const row2 = new ActionRowBuilder().addComponents(yildizInput);

        modal.addComponents(row1, row2);

        return interaction.showModal(modal);
    }
});

// ------------------ Modal Etkileşim ------------------
client.on('interactionCreate', async (interaction) => {
    if (interaction.type !== InteractionType.ModalSubmit) return;
    if (interaction.customId !== 'yorum_modal') return;

    const yorum = interaction.fields.getTextInputValue('yorum_text');
    const yildiz = parseInt(interaction.fields.getTextInputValue('yorum_yildiz'));

    const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username} Bir Yorum Yaptı!`)
        .setDescription(yorum)
        .addFields({ name: 'Yıldızlar', value: '⚡'.repeat(yildiz) })
        .setImage('https://media.tenor.com/0hZMG6yXjPQAAAAC/thor.gif') // GIF direkt alıntı
        .setFooter({ text: 'RevalOWO systems.' })
        .setColor('Blurple');

    const kanal = await client.channels.fetch(yorumKanaliID);
    await kanal.send({ embeds: [embed] });

    await interaction.reply({ content: 'Yorumunuz gönderildi!', ephemeral: true });

    // Yorum yapma butonunu kanala geri ekle (her zaman en altta)
    const buton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('yorum_yap')
            .setLabel('Yorum Yap')
            .setStyle(ButtonStyle.Primary)
    );
    await kanal.send({ content: '💬 Yeni Yorum Yapmak İçin:', components: [buton] });
});

client.login(process.env.TOKEN);
