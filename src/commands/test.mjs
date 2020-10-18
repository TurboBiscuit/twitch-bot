export default {
    name:'test',
    run: async ({
        channel,
        command_name,
        args,
        data,
        message,
        twitch
    }) =>{
        twitch.say(channel,'pog')
    }
}