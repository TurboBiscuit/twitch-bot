export default {
    name:'help',
    run: async ({
        channel,
        command_name,
        args,
        data,
        message,
        twitch
    }) =>{
        twitch.say(channel,'https://bot.smlchief.cf')
    }
}