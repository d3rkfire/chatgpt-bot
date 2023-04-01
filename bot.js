require("dotenv").config()
const fs = require("fs")
const responses = require("./responses.json")
const roleRequestQueue = []

const Configuration = require("openai").Configuration
const OpenAIApi = require("openai").OpenAIApi
const config = new Configuration({
    organization: process.env.OPENAI_ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY
})
// const openai = new OpenAIApi(config)

const TelegramBot = require("node-telegram-bot-api")
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: true})

// Set Role
bot.onText(/^\/setrole$/, (message, _) => {
    bot.sendMessage(message.chat.id, responses.en.setrole.describe)
    roleRequestQueue.push(message.chat.id)
})
bot.onText(/^\/setrole (.+)$/, (message, match) => {
    const roleDescription = match[1].replace(/^\"/, "").replace(/\"$/, "")
    const roleFilepath = "./roles/" + message.chat.id
    fs.writeFile(roleFilepath, roleDescription, (error) => {
        if (error) {
            console.log(error)
            bot.sendMessage(message.chat.id, responses.en.setrole.fail)
        } else {
            const response = responses.en.setrole.success + roleDescription
            bot.sendMessage(message.chat.id, response)
        }
    })
})

// Unset Role
bot.onText(/^\/resetrole$/, (message, _) => {
    const roleFilepath = "./roles/" + message.chat.id
    fs.unlink(roleFilepath, (error) => {
        if (error) console.log(error)
    })
})

// bot.on("message", (message) => {
//     const roleFilepath = "./roles/" + message.chat.id
//     fs.readFile(roleFilepath, "utf-8", (error, data) => {
//         var role = process.env.OPENAI_DEFAULT_ROLE
//         if (error) console.log(error)
//         else role = data

//         bot.sendMessage(message.chat.id, message.text + " AND ROLE is " + role)
//         // openai.createChatCompletion({
//         //     model: process.env.OPENAI_MODEL,
//         //     messages: [
//         //         {role: "system", content: role},
//         //         {role: "user", content: message.text}
//         //     ]
//         // }).then((completion) => {
//         //     bot.sendMessage(message.chat.id, completion.data.choices[0].message.content)
//         // })
//     })
// })