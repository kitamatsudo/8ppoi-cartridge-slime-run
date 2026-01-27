export class Cartridge {
  /** リセット処理 */
  static onReset({ pads, speakers, screens }) {
    this.pads = pads;
    this.speakers = speakers;
    this.screens = screens;

    // 画面設定 (160x120)
    this.SCREEN_WIDTH = 160;
    this.SCREEN_HEIGHT = 120;
    this.screens[0].setViewBox(0, 0, this.SCREEN_WIDTH, this.SCREEN_HEIGHT);

    // 定数
    this.GRAVITY = 0.3;
    this.JUMP_POWER = -4.0;
    this.MOVE_SPEED = 1.0;
    this.GROUND_Y = 100;
    this.TILE_SIZE = 8;

    // ステージデータ (0=空, 1=地面, 2=穴, 3=チェックポイント, 4=ゴール)
    // 各タイルは8px幅
    this.stageData = [
      // スタート地点
      1, 1, 1, 1, 1, 1, 1, 1,
      // 最初の穴
      1, 1, 2, 1, 1, 1, 1, 1,
      // 段差
      1, 1, 1, 1, 1, 1, 1, 1,
      // チェックポイント1
      1, 1, 1, 3, 1, 1, 1, 1,
      // 連続した穴
      1, 2, 2, 1, 1, 2, 1, 1,
      // 長い地面
      1, 1, 1, 1, 1, 1, 1, 1,
      // チェックポイント2
      1, 1, 3, 1, 1, 1, 1, 1,
      // 難しい穴地帯
      1, 2, 1, 2, 1, 2, 2, 1,
      // 最後の直線
      1, 1, 1, 1, 1, 1, 1, 1,
      // ゴール
      1, 1, 1, 4, 1, 1, 1, 1,
    ];

    this.STAGE_LENGTH = this.stageData.length * this.TILE_SIZE;

    // スプライト配列
    this.groundSprites = [];
    this.checkpointSprites = [];
    this.goalSprite = null;

    // ゲーム状態
    this.lastCheckpoint = 0;
    this.isGameover = false;
    this.isCleared = false;

    this.initStage();
    this.restart();
  }

  /** ステージ初期化 */
  static initStage() {
    // 既存のスプライトをクリア
    this.groundSprites.forEach((s) => s?.remove());
    this.checkpointSprites.forEach((s) => s?.remove());
    this.goalSprite?.remove();
    this.groundSprites = [];
    this.checkpointSprites = [];

    // 地面タイル (8x8)
    const groundPattern = [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 1, 1, 1, 1, 2, 1],
      [1, 1, 1, 2, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 2, 1, 1],
      [2, 1, 1, 1, 1, 1, 1, 2],
      [1, 1, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 2, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ];

    // チェックポイントの旗 (5x10)
    const checkpointPattern = [
      [0, 0, 1, 1, 1],
      [0, 0, 1, 2, 1],
      [0, 0, 1, 1, 1],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ];

    // ゴールの旗 (8x12)
    const goalPattern = [
      [0, 0, 0, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 2, 2, 2, 1],
      [0, 0, 0, 1, 2, 2, 2, 1],
      [0, 0, 0, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 0],
    ];

    // ステージ描画
    for (let i = 0; i < this.stageData.length; i++) {
      const tile = this.stageData[i];
      const x = i * this.TILE_SIZE;

      if (tile === 1 || tile === 3 || tile === 4) {
        // 地面タイルを追加
        const ground = this.screens[0].addSprite(groundPattern, {
          colorIds: [null, 6, 8], // 茶色系
          x: x,
          y: this.GROUND_Y,
        });
        this.groundSprites.push({ sprite: ground, x: x });
      }

      if (tile === 3) {
        // チェックポイント
        const cp = this.screens[0].addSprite(checkpointPattern, {
          colorIds: [null, 15, 9], // 白と黄色
          x: x + 1,
          y: this.GROUND_Y - 10,
        });
        this.checkpointSprites.push({ sprite: cp, x: x, activated: false });
      }

      if (tile === 4) {
        // ゴール
        this.goalSprite = this.screens[0].addSprite(goalPattern, {
          colorIds: [null, 15, 10], // 白と緑
          x: x,
          y: this.GROUND_Y - 12,
        });
        this.goalX = x;
      }
    }

    // スライム (6x4)
    const slimePattern = [
      [0, 1, 1, 1, 1, 0],
      [1, 2, 1, 1, 2, 1],
      [1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 0],
    ];

    this.player = this.screens[0].addSprite(slimePattern, {
      colorIds: [null, 11, 15], // 水色と白（目）
    });

    // UIテキスト
    this.messageText = null;
  }

  /** リスタート */
  static restart() {
    this.isGameover = false;
    this.isCleared = false;

    // カメラ位置
    this.cameraX = Math.max(0, this.lastCheckpoint - 20);

    // プレイヤー初期位置（チェックポイントから）
    this.player.x = this.lastCheckpoint + 4;
    this.player.y = this.GROUND_Y - 4;
    this.player.vy = 0;
    this.player.onGround = true;

    this.messageText?.remove();
    this.messageText = null;

    this.updateCamera();
  }

  /** カメラ更新 */
  static updateCamera() {
    // プレイヤーが画面中央より右にいたらカメラを追従
    const targetCameraX = this.player.x - this.SCREEN_WIDTH / 3;
    this.cameraX = Math.max(
      0,
      Math.min(targetCameraX, this.STAGE_LENGTH - this.SCREEN_WIDTH),
    );

    this.screens[0].setViewBox(
      this.cameraX,
      0,
      this.SCREEN_WIDTH,
      this.SCREEN_HEIGHT,
    );
  }

  /** 地面判定 */
  static isGroundAt(x) {
    const tileIndex = Math.floor(x / this.TILE_SIZE);
    if (tileIndex < 0 || tileIndex >= this.stageData.length) {
      return false;
    }
    const tile = this.stageData[tileIndex];
    return tile !== 0 && tile !== 2; // 空と穴以外は地面
  }

  /** チェックポイント音 */
  static playCheckpointSound() {
    this.sfx?.stop();
    this.sfx = this.speakers[0].play([
      [
        { noteNumber: 12, duration: 4 },
        { noteNumber: 16, duration: 4 },
        { noteNumber: 19, duration: 4 },
        { noteNumber: 24, duration: 8 },
      ],
    ]);
  }

  /** ジャンプ音 */
  static playJumpSound() {
    this.sfx?.stop();
    this.sfx = this.speakers[0].play([
      [
        { noteNumber: 14, duration: 2 },
        { noteNumber: 18, duration: 2 },
      ],
    ]);
  }

  /** ゲームオーバー音 */
  static playGameoverSound() {
    this.sfx?.stop();
    this.sfx = this.speakers[0].play([
      [
        { noteNumber: 12, duration: 8 },
        { noteNumber: 10, duration: 8 },
        { noteNumber: 7, duration: 8 },
        { noteNumber: 4, duration: 16 },
      ],
    ]);
  }

  /** クリア音 */
  static playClearSound() {
    this.sfx?.stop();
    this.sfx = this.speakers[0].play([
      [
        { noteNumber: 12, duration: 4 },
        { noteNumber: 14, duration: 4 },
        { noteNumber: 16, duration: 4 },
        { noteNumber: 17, duration: 4 },
        { noteNumber: 19, duration: 4 },
        { noteNumber: 21, duration: 4 },
        { noteNumber: 23, duration: 4 },
        { noteNumber: 24, duration: 16 },
      ],
    ]);
  }

  /** ゲームオーバー */
  static gameover() {
    this.isGameover = true;
    this.playGameoverSound();
    this.messageText = this.screens[0].addText("GAME OVER", {
      x: this.cameraX + 52,
      y: 50,
      colorIds: [null, 1],
    });
    this.restartText = this.screens[0].addText("X:RETRY", {
      x: this.cameraX + 56,
      y: 70,
      colorIds: [null, 15],
    });
  }

  /** クリア */
  static clear() {
    this.isCleared = true;
    this.playClearSound();
    this.messageText = this.screens[0].addText("CLEAR!", {
      x: this.cameraX + 60,
      y: 50,
      colorIds: [null, 10],
    });
    this.restartText = this.screens[0].addText("X:RESTART", {
      x: this.cameraX + 52,
      y: 70,
      colorIds: [null, 15],
    });
  }

  /** フレーム処理 */
  static onFrame() {
    if (!this.isGameover && !this.isCleared) {
      const pad = this.pads[0].buttons;

      // 左右移動
      if (pad.left.pressed && this.player.x > 0) {
        this.player.x -= this.MOVE_SPEED;
      }
      if (pad.right.pressed) {
        this.player.x += this.MOVE_SPEED;
      }

      // ジャンプ
      if (pad.b0.justPressed && this.player.onGround) {
        this.player.vy = this.JUMP_POWER;
        this.player.onGround = false;
        this.playJumpSound();
      }

      // 重力
      this.player.vy += this.GRAVITY;
      this.player.y += this.player.vy;

      // プレイヤーの足元の座標（左端と右端）
      const footLeft = this.player.x + 1;
      const footRight = this.player.x + 5;

      // 地面判定（左右両方に地面があれば立てる）
      if (this.player.y >= this.GROUND_Y - 4) {
        if (this.isGroundAt(footLeft) && this.isGroundAt(footRight)) {
          // 両足とも地面がある
          this.player.y = this.GROUND_Y - 4;
          this.player.vy = 0;
          this.player.onGround = true;
        } else {
          // 穴に落下
          this.player.onGround = false;
        }
      }

      // 穴に落ちたらゲームオーバー
      if (this.player.y > this.GROUND_Y + 20) {
        this.gameover();
        return;
      }

      // チェックポイント判定
      for (const cp of this.checkpointSprites) {
        if (!cp.activated && Math.abs(this.player.x - cp.x) < 8) {
          cp.activated = true;
          this.lastCheckpoint = cp.x;
          this.playCheckpointSound();
          // 旗の色を変える
          cp.sprite.remove();
          cp.sprite = this.screens[0].addSprite(
            [
              [0, 0, 1, 1, 1],
              [0, 0, 1, 2, 1],
              [0, 0, 1, 1, 1],
              [0, 0, 1, 0, 0],
              [0, 0, 1, 0, 0],
              [0, 0, 1, 0, 0],
              [0, 0, 1, 0, 0],
              [0, 0, 1, 0, 0],
              [0, 0, 1, 0, 0],
              [0, 0, 1, 0, 0],
            ],
            {
              colorIds: [null, 10, 11], // 緑と水色（有効化された色）
              x: cp.x + 1,
              y: this.GROUND_Y - 10,
            },
          );
        }
      }

      // ゴール判定
      if (this.goalX && Math.abs(this.player.x - this.goalX) < 8) {
        this.clear();
        return;
      }

      // カメラ更新
      this.updateCamera();
    } else {
      // ゲームオーバーまたはクリア時
      if (this.pads[0].buttons.b1.justPressed) {
        if (this.isCleared) {
          // クリア後は最初から
          this.lastCheckpoint = 0;
          this.checkpointSprites.forEach((cp) => (cp.activated = false));
        }
        this.restartText?.remove();
        this.restart();
      }
    }
  }
}
