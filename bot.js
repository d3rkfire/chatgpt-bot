require("dotenv").config()
const fs = require("fs")

const Configuration = require("openai").Configuration
const OpenAIApi = require("openai").OpenAIApi
const config = new Configuration({
    organization: process.env.OPENAI_ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

const TelegramBot = require("node-telegram-bot-api")
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: true})
bot.on("message", (message) => {
    const roleFilepath = "roles/" + message.chat.id
    fs.readFile(roleFilepath, "utf-8", (error, data) => {
        var role = process.env.OPENAI_DEFAULT_ROLE
        if (error) console.log(error)
        else role = data
        
        // openai.createChatCompletion({
        //     model: process.env.OPENAI_MODEL,
        //     messages: [
        //         {role: "system", content: role},
        //         {role: "user", content: message.text}
        //     ]
        // }).then((completion) => {
        //     bot.sendMessage(message.chat.id, completion.data.choices[0].message.content)
        // })
    })
    
})