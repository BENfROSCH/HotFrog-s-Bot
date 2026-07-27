import {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} from "discord.js";

import fs from "fs";

import { logger } from "../../utils/logger.js";
import { InteractionHelper } from "../../utils/interactionHelper.js";


// =========================
// CONFIG
// =========================

const DATA = "./strikes.json";

const OWNER_ID = "1403056863976882176";

const STAFF_MANAGER_ROLE = "1496924782493569024";


const STRIKE_CHANNEL_ID = "1523071169950126261";


const STRIKE_ROLES = {
    1: "1523341236746977361",
    2: "1523341314182349050",
    3: "1523343298239008850"
};



// =========================
// DATABASE
// =========================

function loadStrikes() {

    if (!fs.existsSync(DATA)) {
        fs.writeFileSync(DATA, "{}");
    }


    try {

        return JSON.parse(
            fs.readFileSync(DATA, "utf8")
        );

    } catch(error) {

        logger.error(
            "Strike database error:",
            error
        );

        return {};

    }

}



function saveStrikes(data) {

    fs.writeFileSync(
        DATA,
        JSON.stringify(data, null, 4)
    );

}



// =========================
// ROLE UPDATE
// =========================

async function updateStrikeRole(member, amount) {


    for (const role of Object.values(STRIKE_ROLES)) {

        if(member.roles.cache.has(role)) {

            await member.roles.remove(role);

        }

    }



    if(amount > 0) {

        const newRole =
        member.guild.roles.cache.get(
            STRIKE_ROLES[amount]
        );


        if(newRole) {

            await member.roles.add(newRole);

        }

    }

}



// =========================
// COMMAND
// =========================

export default {


data:

new SlashCommandBuilder()

.setName("strike")

.setDescription(
    "Strike management system"
)



.addSubcommand(sub =>

    sub
    .setName("add")
    .setDescription(
        "Give a strike to a user"
    )

    .addUserOption(option =>

        option
        .setName("user")
        .setDescription("User")
        .setRequired(true)

    )


    .addStringOption(option =>

        option
        .setName("reason")
        .setDescription("Reason")
        .setRequired(true)

    )

)



.addSubcommand(sub =>

    sub
    .setName("remove")
    .setDescription(
        "Remove a strike"
    )

    .addUserOption(option =>

        option
        .setName("user")
        .setDescription("User")
        .setRequired(true)

    )

)



.addSubcommand(sub =>

    sub
    .setName("info")
    .setDescription(
        "View strike history"
    )

    .addUserOption(option =>

        option
        .setName("user")
        .setDescription("User")
        .setRequired(true)

    )

),



category: "moderation",



abuseProtection: {
    maxAttempts: 5,
    windowMs: 60000
},



async execute(interaction, config, client) {



    const hasPermission =
        interaction.user.id === OWNER_ID ||
        interaction.member.roles.cache.has(
            STAFF_MANAGER_ROLE
        );



    if(!hasPermission) {

        return InteractionHelper.safeReply(
            interaction,
            {
                content:
                "❌ You do not have permission to use this command.",
                flags: MessageFlags.Ephemeral
            }
        );

    }



    const user =
    interaction.options.getUser("user");


    const member =
    await interaction.guild.members.fetch(
        user.id
    );



    let strikes =
    loadStrikes();



    if(!strikes[user.id]) {

        strikes[user.id] = [];

    }



    const action =
    interaction.options.getSubcommand();





    // =========================
    // ADD
    // =========================


    if(action === "add") {


        if(strikes[user.id].length >= 3) {

            return InteractionHelper.safeReply(
                interaction,
                {
                    content:
                    "❌ This user already has 3 strikes.",
                    flags:
                    MessageFlags.Ephemeral
                }
            );

        }



        const reason =
        interaction.options.getString(
            "reason"
        );



        strikes[user.id].push({

            reason,

            moderator:
            interaction.user.id,

            date:
            Date.now()

        });



        const count =
        strikes[user.id].length;



        await updateStrikeRole(
            member,
            count
        );



        saveStrikes(strikes);




        const embed =
        new EmbedBuilder()

        .setTitle(
            "⚠️ New Strike"
        )

        .setColor(
            "Red"
        )

        .addFields(

            {
                name:"User",
                value:`${user}`
            },

            {
                name:"Reason",
                value:reason
            },

            {
                name:"Strikes",
                value:`${count}/3`
            },

            {
                name:"Moderator",
                value:`${interaction.user}`
            }

        )

        .setTimestamp();



        const channel =
        interaction.guild.channels.cache.get(
            STRIKE_CHANNEL_ID
        );



        if(channel) {

            await channel.send({
                embeds:[embed]
            });

        }



        return InteractionHelper.safeReply(
            interaction,
            {
                content:
                "✅ Strike has been added.",
                flags:
                MessageFlags.Ephemeral
            }
        );

    }





    // =========================
    // REMOVE
    // =========================


    if(action === "remove") {



        if(strikes[user.id].length === 0) {

            return InteractionHelper.safeReply(
                interaction,
                {
                    content:
                    "❌ This user has no strikes.",
                    flags:
                    MessageFlags.Ephemeral
                }
            );

        }



        strikes[user.id].pop();



        const count =
        strikes[user.id].length;



        await updateStrikeRole(
            member,
            count
        );



        saveStrikes(strikes);



        return InteractionHelper.safeReply(
            interaction,
            {
                content:
                `✅ Strike removed from ${user}. Current strikes: ${count}/3`,
                flags:
                MessageFlags.Ephemeral
            }
        );

    }





    // =========================
    // INFO
    // =========================


    if(action === "info") {


        const history =
        strikes[user.id];


        if(history.length === 0) {

            return InteractionHelper.safeReply(
                interaction,
                {
                    content:
                    `${user} has no strikes.`,
                    flags:
                    MessageFlags.Ephemeral
                }
            );

        }



        let text = "";



        history.forEach((strike,index)=>{


            text +=

            `**Strike ${index + 1}**\n` +

            `Reason: ${strike.reason}\n` +

            `Date: <t:${Math.floor(strike.date / 1000)}:R>\n\n`;

        });



        const embed =
        new EmbedBuilder()

        .setTitle(
            `📋 Strike History - ${user.username}`
        )

        .setDescription(text)

        .setColor(
            "Orange"
        );



        return interaction.reply({

            embeds:[embed]

        });

    }



}

};
