import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const code = fs.readFileSync(new URL('./R125_V11_EDUCATION_INPUT_CHECK.ts', import.meta.url), 'utf8')

function run(move) {
    const handlers = {}, messages = [], writes = []
    let x = 10, y = 75, z = 10
    const axes = {X: 'X', Y: 'Y', Z: 'Z'}
    const position = () => {
        const snap = {x,y,z}
        return {getValue(axis) {return snap[axis.toLowerCase()]}}
    }
    const player = {
        position, onChat(name, fn) {handlers[name] = fn},
        say(message) {messages.push(message)}
    }
    vm.runInNewContext(code, {
        player,
        Axis: axes,
        Math,
        loops: {pause(ms) {
            assert.equal(ms, 4000)
            if (move) {x += 2; z -= 3}
        }},
        // Only these globals are supplied: accidental block/world writes fail
    })
    assert.deepEqual(Object.keys(handlers).sort(), ['mabwalk','mabwhere'])
    handlers.mabwhere()
    handlers.mabwalk()
    assert.equal(writes.length, 0)
    return messages
}

test('no game/world mutations: reports coordinates and actual W-style displacement', () => {
    const said = run(true)
    assert(said.some(x => x.includes('MAB_XYZ 10,75,10')))
    assert(said.some(x => x.includes('MAB_WALK_DELTA_XZ 2,3')))
    assert(said.includes('MAB_HORIZONTAL_MOVEMENT_OBSERVED'))
})
test('no displacement is labeled inconclusive, not a building collision', () => {
    const said = run(false)
    assert(said.includes('MAB_NO_HORIZONTAL_MOVEMENT: focus, controls, or obstruction not distinguished'))
    assert(!said.includes('MAB_HORIZONTAL_MOVEMENT_OBSERVED'))
})
