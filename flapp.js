// Config
const FPS = 60
const WIDTH = 432                                               // pixels
const HEIGHT = 720                                              // pixels
const FLAP_PER_SEC = 3                                          // flaps (full flapping animation rotation)
const SPRITE_CHANGE_DURATION = FLAP_PER_SEC / 20                // frames
const SLIDING_SPEED = 2                                         // pixels per frame
const MAX_BIRD_ANGLE = 30                                       // degrees
const MIN_BIRD_ANGLE = -90                                      // degrees

const INIT_BIRD_X = 0.25 * WIDTH                                // pixels
const INIT_BIRD_Y = 0.5 * HEIGHT                                // pixels

const SCORE_SPRITES_Y = 50

const PIPE_SPAWN_INTERVAL_IN_SECONDS = 4 / SLIDING_SPEED        // seconds
const HOLE_LENGTH = 140                                         // pixels
const MIN_DISTANCE_BETWEEN_PIPEPAIRS = 150                      // pixels
const DISTANCE_BETWEEN_HOLES = 200                              // pixels
const PIPE_Y_UPPER_LIMIT = DISTANCE_BETWEEN_HOLES + 50          // pixels
const PIPE_Y_LOWER_LIMIT = HEIGHT - 144 - 50                    // pixels

const DIFFICULTY_ADJUSTMENT = 0.2                               // 20% speed increase
const INCREASE_DIFFICULTY_INTERVAL_IN_MINUTES = 2               // increase speed of EVERYTHING every interval

// Physics stuffs
const GRAVITY = 0.3
const ANTI_GRAVITY = 8
const LIMIT_DY = 9

// Other config
let difficulty_multiplier = 1.0 // increase over time
let pipe_spawning_interval = PIPE_SPAWN_INTERVAL_IN_SECONDS

// Game assets was taken from: https://github.com/samuelcust/flappy-bird-assets/
const game_window = document.getElementById("game_window")

// Create the application
const flapp = new PIXI.Application()
await flapp.init({ width: WIDTH, height: HEIGHT }) // 9 : 15 aspect ratio
game_window.appendChild(flapp.canvas)

flapp.ticker.maxFPS = FPS; // Setting FPS

// Create a sprite containers for pipes
const pipe_sprites_container = new PIXI.Container()

// Create a sprite containers for score numbers
const score_sprites_container = new PIXI.Container()

// Loading assets
const asset_sprite_bg = await PIXI.Assets.load('assets/sprites/background-day.png') // doubled for sliding background
const asset_sprite_ground = await PIXI.Assets.load('assets/sprites/base.png')
const asset_sprite_birb_0 = await PIXI.Assets.load('assets/sprites/yellowbird-downflap.png')
const asset_sprite_birb_1 = await PIXI.Assets.load('assets/sprites/yellowbird-midflap.png')
const asset_sprite_birb_2 = await PIXI.Assets.load('assets/sprites/yellowbird-upflap.png')
const asset_sprite_pipe = await PIXI.Assets.load('assets/sprites/pipe-green.png')
const asset_sprite_get_ready_msg = await PIXI.Assets.load('assets/sprites/message.png')
const asset_sprite_game_over_msg = await PIXI.Assets.load('assets/sprites/gameover.png')
const asset_sprite_retry = await PIXI.Assets.load('assets/sprites/retry.png')

const asset_sprite_num_0 = await PIXI.Assets.load('assets/sprites/0.png')
const asset_sprite_num_1 = await PIXI.Assets.load('assets/sprites/1.png')
const asset_sprite_num_2 = await PIXI.Assets.load('assets/sprites/2.png')
const asset_sprite_num_3 = await PIXI.Assets.load('assets/sprites/3.png')
const asset_sprite_num_4 = await PIXI.Assets.load('assets/sprites/4.png')
const asset_sprite_num_5 = await PIXI.Assets.load('assets/sprites/5.png')
const asset_sprite_num_6 = await PIXI.Assets.load('assets/sprites/6.png')
const asset_sprite_num_7 = await PIXI.Assets.load('assets/sprites/7.png')
const asset_sprite_num_8 = await PIXI.Assets.load('assets/sprites/8.png')
const asset_sprite_num_9 = await PIXI.Assets.load('assets/sprites/9.png')

const asset_sprite_hitbox = await PIXI.Assets.load('assets/sprites/hitbox.png')

const birb_frames = [
    PIXI.Texture.from('assets/sprites/yellowbird-downflap.png'),
    PIXI.Texture.from('assets/sprites/yellowbird-midflap.png'),
    PIXI.Texture.from('assets/sprites/yellowbird-upflap.png')
]

const digit_assets = [
    asset_sprite_num_0,
    asset_sprite_num_1,
    asset_sprite_num_2,
    asset_sprite_num_3,
    asset_sprite_num_4,
    asset_sprite_num_5,
    asset_sprite_num_6,
    asset_sprite_num_7,
    asset_sprite_num_8,
    asset_sprite_num_9
]

PIXI.sound.add('click', 'assets/audio/swoosh.wav');
PIXI.sound.add('hit', 'assets/audio/hit.wav');
PIXI.sound.add('score', 'assets/audio/point.wav');
PIXI.sound.add('gameover', 'assets/audio/gameover.wav');

// Creating sprites
const background = PIXI.Sprite.from(asset_sprite_bg)
const get_ready_msg = PIXI.Sprite.from(asset_sprite_get_ready_msg)
const game_over_msg = PIXI.Sprite.from(asset_sprite_game_over_msg)
const retry_btn = PIXI.Sprite.from(asset_sprite_retry)
const ground = PIXI.Sprite.from(asset_sprite_ground)
const birb = new PIXI.AnimatedSprite(birb_frames)
const original_pipe_upper = PIXI.Sprite.from(asset_sprite_pipe)
const original_pipe_lower = PIXI.Sprite.from(asset_sprite_pipe)
const hitbox = PIXI.Sprite.from(asset_sprite_hitbox)

// Flags
let playing = false
let sliding = true
let birb_dead = false

// Global variables
let score = 0
let currentFrame = 0
let dy = 0
let msg_exists = true
let angle = 0
let pipe_pairs = []
let pipe_spawning_point = WIDTH

// Ultility functions
function randInt(min, max)
{
    return Math.floor((max - min) * Math.random() + min)
}

// Background object
ground.y = background.height - ground.height

// Get ready message object
get_ready_msg.anchor.set(0.5)
get_ready_msg.x = WIDTH / 2
get_ready_msg.y = HEIGHT / 2.5

// Game over message object
game_over_msg.anchor.set(0.5)
game_over_msg.x = WIDTH / 2
game_over_msg.y = HEIGHT / 1.5
game_over_msg.alpha = 0.0

// Ground object

// Pipe objects
let last_pipe_y = INIT_BIRD_Y
let current_last_pipe_x = INIT_BIRD_X // to prevent spawning pipes too close to each other when difficulty increases

original_pipe_lower.x = pipe_spawning_point
original_pipe_lower.y = last_pipe_y + randInt(-DISTANCE_BETWEEN_HOLES, DISTANCE_BETWEEN_HOLES)

original_pipe_upper.angle = -180
original_pipe_upper.x = original_pipe_lower.x + original_pipe_lower.width
original_pipe_upper.y = original_pipe_lower.y - HOLE_LENGTH

// adding the first pipe, the following pipes will spawn in intervals
pipe_pairs.push({x: original_pipe_lower.x,
                 y: original_pipe_lower.y,
                 upper_sprite: original_pipe_upper,
                 lower_sprite: original_pipe_lower,
                 passed: false})

last_pipe_y = pipe_pairs[0].y

// Bird object
birb.animationSpeed = SPRITE_CHANGE_DURATION
birb.anchor.set(0.5)
birb.x = INIT_BIRD_X
birb.y = INIT_BIRD_Y

hitbox.anchor.set(0.5)
hitbox.x = INIT_BIRD_X
hitbox.y = INIT_BIRD_Y

let birb_bounds = birb.getLocalBounds() // used for ground collision detection

// Scores sprites
let score_sprites_list = [PIXI.Sprite.from(digit_assets[0])]
score_sprites_list[0].y = SCORE_SPRITES_Y
score_sprites_list[0].x = (WIDTH - score_sprites_list[0].width) / 2
score_sprites_container.alpha = 0

// Retry button
retry_btn.anchor.set(0.5)
retry_btn.x = WIDTH / 2
retry_btn.y = HEIGHT / 2
retry_btn.alpha = 0.0
let retry_btn_original_width = retry_btn.width
let retry_btn_original_height = retry_btn.height

// Event handling
function onClickedAnywhereToFlap()
{
    if (playing)
    {
        dy += ANTI_GRAVITY
    
        if (dy > LIMIT_DY)
            dy = LIMIT_DY

        PIXI.sound.play('click')
    }
}

function onClickMessageToStart()
{
    if (msg_exists)
    {
        if (!playing)
        {
            playing = true

            dy += ANTI_GRAVITY

            if (dy > LIMIT_DY)
                dy = LIMIT_DY

            PIXI.sound.play('click')
        }
    }
}

function onRetryBtnMouseHover()
{
    if ((retry_btn.alpha >= 1.0) && (game_over_msg.alpha >= 1.0))
    {   
        retry_btn.scale.x *= 1.1
        retry_btn.scale.y *= 1.1
    }
}

function onRetryBtnMouseLeave()
{
    if ((retry_btn.alpha >= 1.0) && (game_over_msg.alpha >= 1.0))
    {
        retry_btn.scale.x *= retry_btn_original_width / retry_btn.width
        retry_btn.scale.y *= retry_btn_original_height / retry_btn.height
    }   
}

function onPressedRetry()
{
    GAME_RESET()
}

// IMPORTANT: REMEMBER TO SET EVENT MODE
background.eventMode = 'static'
ground.eventMode = 'static'
birb.eventMode = 'static'
get_ready_msg.eventMode = 'static'
retry_btn.eventMode = 'static'

birb.on('pointerdown', onClickedAnywhereToFlap)
background.on('pointerdown', onClickedAnywhereToFlap)
ground.on('pointerdown', onClickedAnywhereToFlap)
get_ready_msg.on('pointerdown', onClickedAnywhereToFlap)
get_ready_msg.on('pointerdown', onClickMessageToStart)
retry_btn.on('pointerenter', onRetryBtnMouseHover)
retry_btn.on('pointerleave', onRetryBtnMouseLeave)
retry_btn.on('pointerdown', onPressedRetry)

// Adding sprites
pipe_sprites_container.addChild(pipe_pairs[0].lower_sprite)
pipe_sprites_container.addChild(pipe_pairs[0].upper_sprite)

score_sprites_container.addChild(score_sprites_list[0])

flapp.stage.addChild(background)
flapp.stage.addChild(pipe_sprites_container)
flapp.stage.addChild(birb)
// flapp.stage.addChild(hitbox) // for debugging only
flapp.stage.addChild(score_sprites_container)
flapp.stage.addChild(ground)
flapp.stage.addChild(get_ready_msg)
birb.play()

// Game related functions
function GAME_OVER()
{
    PIXI.sound.play('hit')
    PIXI.sound.play('gameover')
    playing = false
    sliding = false
    birb_dead = true
    flapp.stage.addChild(game_over_msg)

    dy += ANTI_GRAVITY

    if (dy > LIMIT_DY)
        dy = LIMIT_DY

    birb.stop()
}

function GAME_RESET()
{
    // Reset flags
    birb_dead = false
    sliding = true
    playing = false
    msg_exists = true

    // Reset positions
    background.x = 0
    ground.x = 0
    birb.x = INIT_BIRD_X
    birb.y = INIT_BIRD_Y

    // Reset rotation
    birb.angle = 0

    // Reset physics parameters
    dy = 0
    currentFrame = 0
    angle = 0

    // Reset 'GET READY' message box
    get_ready_msg.alpha = 1.0

    // Reset scores
    score = 0
    score_sprites_list.length = 0
    score_sprites_list = [PIXI.Sprite.from(digit_assets[0])]

    // Reset pipes
    pipe_pairs.length = 0

    // adding the first pipe, the following pipes will spawn in intervals
    last_pipe_y = INIT_BIRD_Y
    current_last_pipe_x = INIT_BIRD_X
    original_pipe_lower.x = pipe_spawning_point
    original_pipe_lower.y = last_pipe_y + randInt(-DISTANCE_BETWEEN_HOLES, DISTANCE_BETWEEN_HOLES)

    original_pipe_upper.x = original_pipe_lower.x + original_pipe_lower.width
    original_pipe_upper.y = original_pipe_lower.y - HOLE_LENGTH

    pipe_pairs.push({x: original_pipe_lower.x,
                     y: original_pipe_lower.y,
                     upper_sprite: original_pipe_upper,
                     lower_sprite: original_pipe_lower,
                     passed: false})

    last_pipe_y = pipe_pairs[0].y

    // Reset sprites containers
    score_sprites_container.removeChildren()
    pipe_sprites_container.removeChildren()

    // Reset difficulty
    difficulty_multiplier = 1.0 // increase over time
    pipe_spawning_interval = PIPE_SPAWN_INTERVAL_IN_SECONDS
    
    // Remove retry btn
    flapp.stage.removeChild(retry_btn)

    // Remove gameover message
    flapp.stage.removeChild(game_over_msg)

    // Reset bird animation
    birb.play()

    // Re-adding sprites
    score_sprites_list[0].y = SCORE_SPRITES_Y
    score_sprites_list[0].x = (WIDTH - score_sprites_list[0].width) / 2
    score_sprites_container.alpha = 0

    pipe_sprites_container.addChild(pipe_pairs[0].lower_sprite)
    pipe_sprites_container.addChild(pipe_pairs[0].upper_sprite)

    score_sprites_container.addChild(score_sprites_list[0])
}

// Game loop, for each frame
flapp.ticker.add((time) =>
{   
    // Game over!
    if (birb_dead)
    {
        if (birb.angle < 90)
        {
            dy -= GRAVITY * time.deltaTime * difficulty_multiplier
            angle = dy * 6 - 18 // just a random linear function to scale rotation angle with dy
            birb.angle = -angle
        }

        // Update bird position
        if (birb.y < HEIGHT - ground.height + 40)
        {
            birb.y -= dy
        }
        

        // Show game over message
        game_over_msg.alpha += 0.02

        if (game_over_msg.y > HEIGHT / 3)
            game_over_msg.y += dy

        // Show retry button
        flapp.stage.addChild(retry_btn)

        if (game_over_msg.alpha >= 1.0) // only show retry button when the 'GAME OVER' msg fully appeared
            retry_btn.alpha += 0.02
    }

    if (sliding)
    {
        // Sliding background
        if (background.x - SLIDING_SPEED <= -WIDTH)
            background.x = 0
    
        background.x -= SLIDING_SPEED * time.deltaTime * difficulty_multiplier
    
        // Sliding ground
        if (ground.x - SLIDING_SPEED <= -WIDTH)
            ground.x = 0

        ground.x -= SLIDING_SPEED * time.deltaTime * difficulty_multiplier
    }

    if (playing)
    {   
        currentFrame += 1

        // Message box visibility
        if (msg_exists)
        {
            get_ready_msg.alpha -= 0.1
            
            if (get_ready_msg.alpha <= 0.0)
                msg_exists = false

            score_sprites_container.alpha += 0.1
        }

        if (currentFrame % (INCREASE_DIFFICULTY_INTERVAL_IN_MINUTES * 60 * FPS) == 0) // frame = minute * second_per_minute * frame_per_second
        {
            difficulty_multiplier += DIFFICULTY_ADJUSTMENT
            pipe_spawning_interval = 4 / (SLIDING_SPEED * difficulty_multiplier)
            console.log("DIFFICULTY INCREASED!")
        }
            
        dy -= GRAVITY * time.deltaTime * difficulty_multiplier
        angle = dy * 6 - 18 // just a random linear function to scale rotation angle with dy 

        //console.log(difficulty_multiplier)
        
        // Update bird rotation
        if (angle < MIN_BIRD_ANGLE)
            birb.angle = -MIN_BIRD_ANGLE
        else if (angle > MAX_BIRD_ANGLE)
            birb.angle = -MAX_BIRD_ANGLE
        else
            birb.angle = -angle

        // Update bird position
        birb.y -= dy

        // For collision check
        let bounds = birb.getBounds(true)

        hitbox.x = (bounds.minX + bounds.maxX) / 2
        hitbox.y = (bounds.minY + bounds.maxY) / 2
        
        let diff = 1 - Math.cos(angle * (Math.PI / 180))
        let x_offset = 3 + (birb.width / 2) * diff // to compensate for sprite rotation
        let y_offset = 3 + (birb.height / 2) * diff // to compensate for sprite rotation

        bounds.minX = Math.floor(bounds.minX)
        bounds.maxX = Math.floor(bounds.maxX)
        bounds.minY = Math.floor(bounds.minY)
        bounds.maxY = Math.floor(bounds.maxY)

        // Sliding pipes, pipes passed and collision check
        pipe_pairs.forEach(pipe_pair => {
            
            // Collision checking
            if ((bounds.maxX >= pipe_pair.x + x_offset) && (bounds.minX <= pipe_pair.x + pipe_pair.lower_sprite.width - x_offset))
                {
                    if (((bounds.minY >= pipe_pair.y - HOLE_LENGTH - y_offset) && (bounds.maxY <= pipe_pair.y + y_offset)) == false)
                    {
                        // console.log("LOWER: ", pipe_pair.lower_sprite.x, pipe_pair.lower_sprite.y)
                        // console.log("UPPER: ", pipe_pair.upper_sprite.x, pipe_pair.upper_sprite.y)
                        GAME_OVER()
                    }
                }

            // Sliding
            pipe_pair.lower_sprite.x -= SLIDING_SPEED * time.deltaTime * difficulty_multiplier
            pipe_pair.upper_sprite.x -= SLIDING_SPEED * time.deltaTime * difficulty_multiplier
            pipe_pair.x = pipe_pair.lower_sprite.x
            current_last_pipe_x = pipe_pair.x // will be correctly updated at the last pipepair

            // Passed check (SCORED!)
            if (pipe_pair.upper_sprite.x - (pipe_pair.upper_sprite.width / 2) < birb.x)
            {
                if (pipe_pair.passed == false)
                {
                    score += 1
                    //console.log("SCORE: ", score)
                    PIXI.sound.play('score')

                    // update score sprites list
                    score_sprites_list = []
                    score_sprites_container.removeChildren()
                    
                    let digit = 1
                    let n = JSON.parse(JSON.stringify(score)); // deep copy
                    let total_width = 0

                    while (n > 0)
                    {
                        digit = n % 10
                        n = Math.floor(n / 10)
                        let i = score_sprites_list.push(PIXI.Sprite.from(digit_assets[digit]))
                        total_width += score_sprites_list[i-1].width
                    }

                    // adjusting scores digits to be at the center of the screen
                    let len = score_sprites_list.length
                    let last_x = (WIDTH - total_width) / 2

                    for (let i = len - 1; i >= 0; i--)
                    {
                        score_sprites_list[i].y = SCORE_SPRITES_Y
                        score_sprites_list[i].x = last_x
                        last_x += score_sprites_list[i].width

                        score_sprites_container.addChild(score_sprites_list[i])
                    }
                }

                pipe_pair.passed = true
            }
        })

        // Free memory if the first pipe pair in the pipe pair array, if it's not visible anymore
        if (pipe_pairs[0].upper_sprite.x < 0)
        {
            pipe_sprites_container.removeChild(pipe_pairs[0].upper_sprite)
            pipe_sprites_container.removeChild(pipe_pairs[0].lower_sprite)
            pipe_pairs.shift()
            //console.log("DEALLOCATING PIPES")
        }
        
        // Ground colision check
        if (birb.y > background.height - ground.height - birb_bounds.maxY)
        {
            GAME_OVER()
        }

        // Spawn pipes if reached interval, and new pipe will be far enough from last pipe
        if ((pipe_spawning_point - (current_last_pipe_x + pipe_pairs[0].lower_sprite.width) >= MIN_DISTANCE_BETWEEN_PIPEPAIRS) 
            && (currentFrame % Math.floor(pipe_spawning_interval * FPS) == 0)) // seconds * frame_per_seconds
        {   
            // console.log("SPAWNING PIPES")
            let new_pipe_y = last_pipe_y + randInt(-DISTANCE_BETWEEN_HOLES, DISTANCE_BETWEEN_HOLES)
            
            if (new_pipe_y > PIPE_Y_LOWER_LIMIT)
                new_pipe_y = PIPE_Y_LOWER_LIMIT

            if (new_pipe_y < PIPE_Y_UPPER_LIMIT)
                new_pipe_y = PIPE_Y_UPPER_LIMIT

            let i = pipe_pairs.push({x: pipe_spawning_point,
                                     y: new_pipe_y,
                                     upper_sprite: PIXI.Sprite.from(asset_sprite_pipe),
                                     lower_sprite: PIXI.Sprite.from(asset_sprite_pipe),
                                     passed: false})
            
            last_pipe_y = pipe_pairs[i-1].y
            
            pipe_pairs[i-1].lower_sprite.x = pipe_pairs[i-1].x
            pipe_pairs[i-1].lower_sprite.y = pipe_pairs[i-1].y
            
            pipe_pairs[i-1].upper_sprite.angle = -180
            pipe_pairs[i-1].upper_sprite.x = pipe_pairs[i-1].lower_sprite.x + pipe_pairs[i-1].lower_sprite.width
            pipe_pairs[i-1].upper_sprite.y = pipe_pairs[i-1].lower_sprite.y - HOLE_LENGTH

            pipe_sprites_container.addChild(pipe_pairs[i-1].lower_sprite)
            pipe_sprites_container.addChild(pipe_pairs[i-1].upper_sprite)
        }
    }
})