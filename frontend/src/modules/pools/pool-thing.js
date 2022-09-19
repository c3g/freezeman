
import { getSomePools } from "./pool-model"


async function doMorePooling() {
    reply = await getSomePools()
    return reply
}