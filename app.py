from flask import Flask, render_template, request, redirect, session, jsonify
from database import init_app, get_db, init_db  # 添加这行导入
import sqlite3

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # 设置密钥用于session

# 初始化数据库
with app.app_context():
    init_db()
    init_app(app)

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect('/login')
    return redirect('/game')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        db = get_db()
        user = db.execute(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            (username, password)
        ).fetchone()
        
        if user:
            session['user_id'] = user['id']
            session['level'] = user['current_level']
            return redirect('/game')
        else:
            return render_template('login.html', error='用户名或密码错误')
            
    return render_template('login.html')

@app.route('/game')
def game():
    if 'user_id' not in session:
        return redirect('/login')
    
    db = get_db()
    user = db.execute(
        'SELECT current_level, high_score FROM users WHERE id = ?',
        (session['user_id'],)
    ).fetchone()
    
    # 获取用户每个关卡的最高分
    high_scores = {}
    scores = db.execute(
        'SELECT level, MAX(score) as high_score FROM level_scores WHERE user_id = ? GROUP BY level',
        (session['user_id'],)
    ).fetchall()
    
    for score in scores:
        high_scores[score['level']] = score['high_score']
    
    return render_template('game.html',
                         current_level=user['current_level'],
                         unlocked_level=user['current_level'],
                         max_level=2,  # 目前只有2个关卡
                         high_scores=high_scores)

@app.route('/save_score', methods=['POST'])
def save_score():
    if 'user_id' not in session:
        return jsonify({'success': False})
    
    data = request.get_json()
    level = data.get('level')
    score = data.get('score')
    
    db = get_db()
    # 保存关卡分数
    db.execute(
        'INSERT INTO level_scores (user_id, level, score) VALUES (?, ?, ?)',
        (session['user_id'], level, score)
    )
    
    # 更新用户当前关卡
    current_level = db.execute(
        'SELECT current_level FROM users WHERE id = ?',
        (session['user_id'],)
    ).fetchone()['current_level']
    
    if level >= current_level and level < 2:  # 如果完成当前关卡且不是最后一关
        db.execute(
            'UPDATE users SET current_level = ? WHERE id = ?',
            (level + 1, session['user_id'])
        )
    
    db.commit()
    return jsonify({'success': True})

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        if password != confirm_password:
            return render_template('register.html', error='两次输入的密码不一致')
            
        if len(username) < 3:
            return render_template('register.html', error='用户名长度至少为3个字符')
            
        if len(password) < 6:
            return render_template('register.html', error='密码长度至少为6个字符')
        
        db = get_db()
        try:
            db.execute(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                (username, password)
            )
            db.commit()
            return redirect('/login')
        except sqlite3.IntegrityError:
            return render_template('register.html', error='用户名已存在')
            
    return render_template('register.html')

@app.route('/get_powerups', methods=['GET'])
def get_powerups():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'User not logged in'})
    
    db = get_db()
    powerups = db.execute(
        'SELECT powerup_type, quantity FROM user_powerups WHERE user_id = ?',
        (session['user_id'],)
    ).fetchall()
    
    powerup_dict = {powerup['powerup_type']: powerup['quantity'] for powerup in powerups}
    return jsonify({'success': True, 'powerups': powerup_dict})

@app.route('/update_powerup', methods=['POST'])
def update_powerup():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'User not logged in'})
    
    data = request.get_json()
    powerup_type = data.get('powerup_type')
    change = data.get('change', 0)
    
    db = get_db()
    db.execute(
        '''
        INSERT INTO user_powerups (user_id, powerup_type, quantity)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, powerup_type) DO UPDATE SET quantity = quantity + ?
        ''',
        (session['user_id'], powerup_type, max(0, change), change)
    )
    db.commit()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True) 