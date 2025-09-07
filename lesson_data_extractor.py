import sqlite3
import re
from bs4 import BeautifulSoup
import os

def create_database():
    """Create the SQLite database and tables"""
    conn = sqlite3.connect('lesson_info.db')
    cursor = conn.cursor()
    
    # Create the lesson_info table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lesson_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module_name TEXT NOT NULL,
            organ_name TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            key_points TEXT NOT NULL,
            icon_class TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    return conn

def extract_lesson_data(html_content, module_name):
    """Extract lesson information from HTML content"""
    soup = BeautifulSoup(html_content, 'html.parser')
    lessons = []
    
    # Find all info-content divs that contain lesson information
    info_contents = soup.find_all('div', class_='info-content')
    
    for content in info_contents:
        # Skip the default content div
        if 'default' in content.get('class', []):
            continue
            
        # Get the organ ID from the div id attribute
        organ_id = content.get('id')
        if not organ_id:
            continue
            
        # Extract the title and icon
        h4_tag = content.find('h4')
        if not h4_tag:
            continue
            
        # Extract icon class
        icon = h4_tag.find('i')
        icon_class = icon.get('class', [''])[1] if icon and len(icon.get('class', [])) > 1 else ''
        
        # Extract title (remove the icon from the text)
        title = h4_tag.get_text().strip()
        
        # Extract description (the first p tag after h4)
        description_p = content.find('p')
        description = description_p.get_text().strip() if description_p else ''
        
        # Extract key points
        key_points_ul = content.find('ul', class_='key-points')
        key_points = []
        if key_points_ul:
            for li in key_points_ul.find_all('li'):
                key_points.append(li.get_text().strip())
        
        key_points_text = '\n'.join(key_points)
        
        lessons.append({
            'module_name': module_name,
            'organ_name': organ_id,
            'title': title,
            'description': description,
            'key_points': key_points_text,
            'icon_class': icon_class
        })
    
    return lessons

def insert_lesson_data(conn, lessons):
    """Insert lesson data into the database, replacing previous data for the module"""
    cursor = conn.cursor()
    if lessons:
        # Delete previous data for this module
        cursor.execute('DELETE FROM lesson_info WHERE module_name = ?', (lessons[0]['module_name'],))
    for lesson in lessons:
        cursor.execute('''
            INSERT INTO lesson_info (module_name, organ_name, title, description, key_points, icon_class)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            lesson['module_name'],
            lesson['organ_name'],
            lesson['title'],
            lesson['description'],
            lesson['key_points'],
            lesson['icon_class']
        ))
    conn.commit()
    print(f"Inserted {len(lessons)} lessons for {lessons[0]['module_name'] if lessons else 'unknown'} module (previous data deleted)")

def process_html_files():
    """Main function to process HTML files and populate database"""
    
    # Sample HTML content from your files
    reproductive_html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reproductive System Explorer</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/static/css/reproductive_sytem.css">
</head>
<body>
  <div class="container">
    <a href="/menu" class="btn" style="display:inline-block;margin:1.2rem 0;background:linear-gradient(135deg,#f8bbd0,#4361ee);color:#212529;font-weight:600;text-decoration:none;padding:0.6rem 1.5rem;border-radius:30px;">← Back to Menu</a>
    <div class="header">
      <h1><i class="fas fa-venus-mars"></i> Reproductive System Explorer</h1>
      <p>Learn about the anatomy and functions of the reproductive system</p>
      <div class="gender-selector" style="display: flex; justify-content: center; gap: 1.5rem; margin-top: 1rem;">
        <button class="gender-btn active" id="maleBtn">
          <i class="fas fa-mars"></i> Male
        </button>
        <button class="gender-btn" id="femaleBtn">
          <i class="fas fa-venus"></i> Female
        </button>
      </div>
    </div>

    <div class="main-content">
      <!-- Info Panels -->
      <div class="info-panel" id="maleInfoPanel">
        <h3><i class="fas fa-info-circle"></i> Information Panel</h3>
        
        <div class="info-content default" id="defaultContent">
          <div class="info-icon"><i class="fas fa-male"></i></div>
          <p class="default-text">Click on any hotspot to learn about the parts of the male reproductive system.</p>
          <p class="default-text">Drag hotspots to reposition them for better visibility.</p>
        </div>
        
        <div class="info-content" id="testes">
          <h4><i class="fas fa-egg"></i> Testes</h4>
          <p>The testes (or testicles) are two oval-shaped organs located in the scrotum. They produce sperm and testosterone, the primary male sex hormone.</p>
          <ul class="key-points">
            <li>Produce 200-500 million sperm daily</li>
            <li>Maintain temperature 2-3°C below body temperature</li>
            <li>Contain seminiferous tubules where sperm production occurs</li>
            <li>Testosterone production regulated by the pituitary gland</li>
          </ul>
        </div>
        
        <div class="info-content" id="epididymis">
          <h4><i class="fas fa-long-arrow-alt-right"></i> Epididymis</h4>
          <p>The epididymis is a coiled tube located on the back of each testicle. It stores sperm and transports it from the testes to the vas deferens.</p>
          <ul class="key-points">
            <li>Approximately 6 meters long when uncoiled</li>
            <li>Sperm mature and gain motility here</li>
            <li>Can store sperm for several weeks</li>
            <li>Connects the testes to the vas deferens</li>
          </ul>
        </div>
        
        <div class="info-content" id="vas-deferens">
          <h4><i class="fas fa-road"></i> Vas Deferens</h4>
          <p>The vas deferens is a long, muscular tube that transports mature sperm to the urethra in preparation for ejaculation.</p>
          <ul class="key-points">
            <li>Approximately 45 cm long</li>
            <li>Connects epididymis to ejaculatory duct</li>
            <li>Muscular walls propel sperm forward</li>
            <li>Vasectomy procedure involves cutting this tube</li>
          </ul>
        </div>
        
        <div class="info-content" id="seminal-vesicles">
          <h4><i class="fas fa-flask"></i> Seminal Vesicles</h4>
          <p>The seminal vesicles are two glands that produce a significant portion of the fluid that becomes semen. This fluid provides energy for sperm.</p>
          <ul class="key-points">
            <li>Produce 60-70% of semen volume</li>
            <li>Secrete fructose to nourish sperm</li>
            <li>Produce prostaglandins to help sperm mobility</li>
            <li>Located behind the bladder</li>
          </ul>
        </div>
        
        <div class="info-content" id="prostate">
          <h4><i class="fas fa-gem"></i> Prostate Gland</h4>
          <p>The prostate gland is a walnut-sized gland that surrounds the urethra. It produces a milky fluid that forms part of semen and helps sperm survive.</p>
          <ul class="key-points">
            <li>Produces 20-30% of semen volume</li>
            <li>Fluid contains enzymes and minerals</li>
            <li>Helps liquefy semen after ejaculation</li>
            <li>Common site for health issues in older men</li>
          </ul>
        </div>
        
        <div class="info-content" id="urethra">
          <h4><i class="fas fa-tint"></i> Urethra</h4>
          <p>The urethra is a tube that carries urine from the bladder and semen from the reproductive system to the outside of the body.</p>
          <ul class="key-points">
            <li>Dual function: urinary and reproductive</li>
            <li>Approximately 20 cm long in adult males</li>
            <li>Passes through the prostate and penis</li>
            <li>Muscles prevent urine and semen from mixing</li>
          </ul>
        </div>
        
        <div class="info-content" id="penis">
          <h4><i class="fas fa-venus-mars"></i> Penis</h4>
          <p>The penis is the male external reproductive organ. It has three parts: the root, the shaft, and the glans (head).</p>
          <ul class="key-points">
            <li>Composed of spongy erectile tissue</li>
            <li>Functions in sexual intercourse and urination</li>
            <li>Erection occurs when erectile tissue fills with blood</li>
            <li>Glans is covered by foreskin in uncircumcised males</li>
          </ul>
        </div>
      </div>
      <div class="info-panel" id="femaleInfoPanel" style="display:none;">
        <h3><i class="fas fa-info-circle"></i> Information Panel</h3>
        <div class="info-content default" id="defaultContentFemale">
          <div class="info-icon"><i class="fas fa-female"></i></div>
          <p class="default-text">Click on any hotspot to learn about the parts of the female reproductive system.</p>
          <p class="default-text">Drag hotspots to reposition them for better visibility.</p>
        </div>
        <div class="info-content" id="ovary">
          <h4><i class="fas fa-egg"></i> Ovary</h4>
          <p>The ovaries are two small, oval-shaped organs located on either side of the uterus. They produce eggs (ova) and hormones like estrogen and progesterone.</p>
          <ul class="key-points">
            <li>Release one egg per month (ovulation)</li>
            <li>Produce female sex hormones</li>
            <li>Contain all eggs a female will ever have at birth</li>
            <li>Hormone production regulates menstrual cycle</li>
          </ul>
        </div>
        <div class="info-content" id="fallopian">
          <h4><i class="fas fa-road"></i> Fallopian Tube</h4>
          <p>The fallopian tubes are narrow tubes that connect the ovaries to the uterus. They are the site where fertilization usually occurs.</p>
          <ul class="key-points">
            <li>Transport eggs from ovary to uterus</li>
            <li>Site of fertilization</li>
            <li>About 10-12 cm long</li>
            <li>Fimbriae help guide egg into tube</li>
          </ul>
        </div>
        <div class="info-content" id="uterus">
          <h4><i class="fas fa-heart"></i> Uterus</h4>
          <p>The uterus is a hollow, muscular organ where a fertilized egg implants and grows during pregnancy. It sheds its lining during menstruation if no pregnancy occurs.</p>
          <ul class="key-points">
            <li>Site of fetal development</li>
            <li>Contracts during labor</li>
            <li>Changes size during menstrual cycle</li>
            <li>Upper part called the fundus</li>
          </ul>
        </div>
        <div class="info-content" id="cervix">
          <h4><i class="fas fa-door-closed"></i> Cervix</h4>
          <p>The cervix is the lower, narrow part of the uterus that opens into the vagina. It allows flow of menstrual blood and directs sperm into the uterus.</p>
          <ul class="key-points">
            <li>Opens during childbirth</li>
            <li>Produces mucus to help or block sperm</li>
            <li>Common site for health screenings (Pap test)</li>
            <li>Protects uterus from infections</li>
          </ul>
        </div>
        <div class="info-content" id="vagina">
          <h4><i class="fas fa-venus"></i> Vagina</h4>
          <p>The vagina is a muscular canal that connects the cervix to the outside of the body. It serves as the birth canal and the passage for menstrual flow.</p>
          <ul class="key-points">
            <li>About 7-10 cm long</li>
            <li>Receives penis during intercourse</li>
            <li>Passageway for menstrual flow</li>
            <li>Expands during childbirth</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</body>
</html>"""
    
    puberty_html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TeenBody Explorer: Understanding Puberty</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/static/css/puberty.css">
</head>
<body>
  <div class="container">
    <div class="info-panel">
      <h3>Information Hub</h3>
      
      <div class="info-content default" id="defaultContent">
        <div class="info-icon">
          <i class="fas fa-search"></i>
        </div>
        <p class="default-text">Click on any hotspot to learn about the changes that happen during puberty. Your progress will be saved as you explore!</p>
      </div>
      
      <div class="info-content" id="facial-hair">
        <h4><i class="fas fa-face"></i> Facial Hair Development</h4>
        <p>During puberty, increased testosterone levels cause facial hair to develop. This is a normal part of development that typically begins between ages 12-16.</p>
        <ul class="key-points">
          <li>Starts as light, fine hair (peach fuzz)</li>
          <li>Gradually becomes thicker and darker</li>
          <li>Growth patterns vary by individual</li>
          <li>Shaving is optional and personal choice</li>
        </ul>
      </div>
      
      <div class="info-content" id="skin-changes">
        <h4><i class="fas fa-allergies"></i> Skin Changes</h4>
        <p>Hormonal changes cause increased oil production, which can lead to acne. This is a normal part of growing up that affects most teenagers.</p>
        <ul class="key-points">
          <li>Acne is common and completely normal</li>
          <li>Washing your face twice daily helps</li>
          <li>Changes usually improve with time</li>
          <li>Consult a dermatologist for severe cases</li>
        </ul>
      </div>
      
      <div class="info-content" id="muscle-growth">
        <h4><i class="fas fa-dumbbell"></i> Muscle Development</h4>
        <p>Muscles grow larger and stronger during puberty. Everyone experiences this, though the pattern differs between individuals.</p>
        <ul class="key-points">
          <li>Significant strength increases occur</li>
          <li>Regular exercise supports healthy development</li>
          <li>Changes continue into early adulthood</li>
          <li>Body composition evolves naturally</li>
        </ul>
      </div>
      
      <div class="info-content" id="body-hair">
        <h4><i class="fas fa-leaf"></i> Body Hair Growth</h4>
        <p>Body hair begins to grow in new places during puberty, including underarms, legs, and pubic area. This is a natural part of development.</p>
        <ul class="key-points">
          <li>Growth patterns vary by individual</li>
          <li>Hair removal is a personal choice</li>
          <li>Completely normal for all genders</li>
          <li>Color and thickness vary naturally</li>
        </ul>
      </div>
      
      <div class="info-content" id="reproductive-system">
        <h4><i class="fas fa-heartbeat"></i> Reproductive Development</h4>
        <p>The reproductive system undergoes significant changes during puberty, preparing the body for potential reproduction in the future.</p>
        <ul class="key-points">
          <li>Organs mature and develop</li>
          <li>Hormone production increases</li>
          <li>Physical changes occur gradually</li>
          <li>Timing varies significantly by individual</li>
        </ul>
      </div>
      
      <div class="info-content" id="menstruation">
        <h4><i class="fas fa-sync-alt"></i> Menstruation</h4>
        <p>Menstruation typically begins between ages 8-15. It's a natural process that indicates the reproductive system is maturing.</p>
        <ul class="key-points">
          <li>Cycle length varies (21-35 days)</li>
          <li>Completely normal and healthy</li>
          <li>Period products are a personal choice</li>
          <li>Talk to a healthcare provider about concerns</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>"""

    # Create database
    conn = create_database()
    
    try:
        # Process Reproductive System module
        reproductive_lessons = extract_lesson_data(reproductive_html, "reproductive")
        insert_lesson_data(conn, reproductive_lessons)
        
        # Process Puberty module
        puberty_lessons = extract_lesson_data(puberty_html, "puberty")
        insert_lesson_data(conn, puberty_lessons)
        
        print("Database populated successfully!")
        print(f"Total lessons inserted: {len(reproductive_lessons) + len(puberty_lessons)}")
        
        # Display sample data
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lesson_info LIMIT 5")
        sample_data = cursor.fetchall()
        
        print("\nSample data from database:")
        print("ID | Module | Organ | Title | Description Preview")
        print("-" * 80)
        for row in sample_data:
            desc_preview = row[4][:50] + "..." if len(row[4]) > 50 else row[4]
            print(f"{row[0]} | {row[1]} | {row[2]} | {row[3]} | {desc_preview}")
            
    except Exception as e:
        print(f"Error processing files: {str(e)}")
    finally:
        conn.close()

def query_database():
    """Function to query and display all data in the database"""
    conn = sqlite3.connect('lesson_info.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM lesson_info")
    all_data = cursor.fetchall()
    
    print(f"\nAll lessons in database ({len(all_data)} total):")
    print("=" * 100)
    
    for row in all_data:
        print(f"\nID: {row[0]}")
        print(f"Module: {row[1]}")
        print(f"Organ: {row[2]}")
        print(f"Title: {row[3]}")
        print(f"Description: {row[4]}")
        print(f"Key Points:\n{row[5]}")
        print(f"Icon: {row[6]}")
        print(f"Created: {row[7]}")
        print("-" * 50)
    
    conn.close()

if __name__ == "__main__":
    # Run the main processing function
    process_html_files()
    
    # Uncomment the line below to see all data in the database
    # query_database()