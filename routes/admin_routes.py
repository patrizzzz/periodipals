from flask import Blueprint, render_template, request, redirect, url_for
import sqlite3

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/lesson_info', methods=['GET', 'POST'])
def lesson_info_admin():
    conn = sqlite3.connect('lesson_info.db')
    cursor = conn.cursor()
    if request.method == 'POST':
        module_name = request.form.get('module_name')
        organ_name = request.form.get('organ_name')
        title = request.form.get('title')
        description = request.form.get('description')
        key_points = request.form.get('key_points')
        icon_class = request.form.get('icon_class')
        cursor.execute('''
            INSERT INTO lesson_info 
            (module_name, organ_name, title, description, key_points, icon_class) 
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (module_name, organ_name, title, description, key_points, icon_class))
        conn.commit()
    
    cursor.execute('SELECT * FROM lesson_info ORDER BY id DESC')
    lessons = cursor.fetchall()
    conn.close()
    return render_template('lesson_info_admin.html', lessons=lessons)

@admin_bp.route('/lesson_info/delete/<int:lesson_id>', methods=['POST'])
def lesson_info_delete(lesson_id):
    conn = sqlite3.connect('lesson_info.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM lesson_info WHERE id = ?', (lesson_id,))
    conn.commit()
    conn.close()
    return redirect(url_for('admin.lesson_info_admin'))

@admin_bp.route('/lesson_info/edit/<int:lesson_id>', methods=['POST'])
def lesson_info_edit(lesson_id):
    conn = sqlite3.connect('lesson_info.db')
    cursor = conn.cursor()
    module_name = request.form.get('module_name')
    organ_name = request.form.get('organ_name')
    title = request.form.get('title')
    description = request.form.get('description')
    key_points = request.form.get('key_points')
    icon_class = request.form.get('icon_class')
    cursor.execute('''
        UPDATE lesson_info 
        SET module_name=?, organ_name=?, title=?, description=?, key_points=?, icon_class=? 
        WHERE id=?
    ''', (module_name, organ_name, title, description, key_points, icon_class, lesson_id))
    conn.commit()
    conn.close()
    return redirect(url_for('admin.lesson_info_admin'))