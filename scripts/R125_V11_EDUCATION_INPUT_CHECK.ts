// MAB V11: read-only Minecraft Education movement/focus diagnostic.
// In the existing dedicated flat test world, open Code Builder (C), paste,
// run, then use chat "mabwhere" or "mabwalk". No model, blocks, teleport,
// build commands, or world modifications. Always test on clear ground first.
player.onChat("mabwhere", function () {
    let p = player.position()
    player.say("MAB_XYZ " + p.getValue(Axis.X) + "," +
        p.getValue(Axis.Y) + "," + p.getValue(Axis.Z))
})
player.onChat("mabwalk", function () {
    let start = player.position()
    player.say("MAB_WALK_BEGIN: press W in the game for 4 seconds")
    loops.pause(4000)
    let finish = player.position()
    let dx = Math.abs(finish.getValue(Axis.X) - start.getValue(Axis.X))
    let dz = Math.abs(finish.getValue(Axis.Z) - start.getValue(Axis.Z))
    player.say("MAB_WALK_DELTA_XZ " + dx + "," + dz)
    if (dx + dz >= 1) {
        player.say("MAB_HORIZONTAL_MOVEMENT_OBSERVED")
    } else {
        player.say("MAB_NO_HORIZONTAL_MOVEMENT: focus, controls, or obstruction not distinguished")
    }
})
