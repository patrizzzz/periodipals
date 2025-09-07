 const dragItems = document.querySelectorAll('.drag-item');
        const dropZone = document.getElementById('zoneItems');
        const dropZoneContainer = document.getElementById('dropZone');
        const dragContainer = document.getElementById('dragContainer');
        const feedback = document.getElementById('dragFeedback');
        const submitBtn = document.getElementById('submitBtn');
        const resetBtn = document.getElementById('resetBtn');
        const progressFill = document.getElementById('progressFill');
        const stepCount = document.getElementById('stepCount');
        
        let order = [];
        let draggedElement = null;
        // Simple sound effects using Web Audio API
        let _audioCtx;
        function getAudioCtx(){
            if (!_audioCtx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                _audioCtx = new AC();
            }
            return _audioCtx;
        }
        function playSuccessSound(){
            const ctx = getAudioCtx();
            const t = ctx.currentTime;
            // Note 1
            const o1 = ctx.createOscillator();
            const g1 = ctx.createGain();
            o1.type = 'sine';
            o1.frequency.setValueAtTime(660, t);
            g1.gain.setValueAtTime(0.0001, t);
            g1.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
            g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
            o1.connect(g1).connect(ctx.destination);
            o1.start(t);
            o1.stop(t + 0.2);
            // Note 2
            const o2 = ctx.createOscillator();
            const g2 = ctx.createGain();
            o2.type = 'sine';
            o2.frequency.setValueAtTime(880, t + 0.18);
            g2.gain.setValueAtTime(0.0001, t + 0.18);
            g2.gain.exponentialRampToValueAtTime(0.25, t + 0.2);
            g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
            o2.connect(g2).connect(ctx.destination);
            o2.start(t + 0.18);
            o2.stop(t + 0.36);
        }
        function playErrorSound(){
            const ctx = getAudioCtx();
            const t = ctx.currentTime;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(220, t);
            o.frequency.exponentialRampToValueAtTime(160, t + 0.25);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
            o.connect(g).connect(ctx.destination);
            o.start(t);
            o.stop(t + 0.32);
        }

        function updateProgress() {
            const progress = (order.length / 5) * 100;
            progressFill.style.width = progress + '%';
            stepCount.textContent = order.length;
            
            if (order.length === 5) {
                submitBtn.style.display = 'inline-block';
                resetBtn.style.display = 'inline-block';
            }
        }

        function addOrderNumber(item, position) {
            item.setAttribute('data-order', position + 1);
        }

        dragItems.forEach(item => {
            item.addEventListener('dragstart', e => {
                draggedElement = item;
                e.dataTransfer.setData('text/plain', item.dataset.step);
                setTimeout(() => item.classList.add('dragging'), 0);
            });
            
            item.addEventListener('dragend', e => {
                item.classList.remove('dragging');
                draggedElement = null;
            });
        });

        dropZoneContainer.addEventListener('dragover', e => {
            e.preventDefault();
            dropZoneContainer.classList.add('highlight');
        });

        dropZoneContainer.addEventListener('dragleave', e => {
            if (!dropZoneContainer.contains(e.relatedTarget)) {
                dropZoneContainer.classList.remove('highlight');
            }
        });

        dropZoneContainer.addEventListener('drop', e => {
            e.preventDefault();
            dropZoneContainer.classList.remove('highlight');
            
            const step = e.dataTransfer.getData('text/plain');
            const item = document.querySelector(`.drag-item[data-step='${step}']`);
            
            if (item && !item.classList.contains('in-zone')) {
                item.classList.add('in-zone');
                item.setAttribute('draggable', 'false');
                addOrderNumber(item, order.length);
                dropZone.appendChild(item);
                order.push(parseInt(step));
                updateProgress();
                
                // Add a small celebration animation
                item.style.animation = 'bounceIn 0.5s ease-out';
                setTimeout(() => {
                    item.style.animation = '';
                }, 500);
            }
        });

        submitBtn.addEventListener('click', () => {
            const correct = [1, 0, 2, 3, 4]; // Wet, Apply, Scrub, Rinse, Dry
            const stepNames = ['Apply Soap', 'Wet Hands', 'Scrub All Surfaces', 'Rinse Hands', 'Dry Hands'];
            
            let isCorrect = true;
            for (let i = 0; i < correct.length; i++) {
                if (order[i] !== correct[i]) {
                    isCorrect = false;
                    break;
                }
            }
            
            feedback.style.display = 'block';
            
            if (isCorrect) {
                try { playSuccessSound(); } catch (e) {}
                feedback.innerHTML = `
                    <div>🎉 Excellent! You got the handwashing steps right!</div>
                    <div style="margin-top: 10px; font-size: 0.9em;">
                        Proper handwashing prevents the spread of germs and keeps you healthy!
                    </div>
                `;
                feedback.className = 'drag-feedback correct-feedback';
                
                // Add celebration effect
                document.body.style.animation = 'none';
                setTimeout(() => {
                    document.body.style.animation = 'celebration 0.8s ease-out';
                }, 10);
            } else {
                try { playErrorSound(); } catch (e) {}
                feedback.innerHTML = `
                    <div>🤔 Not quite right! Try again!</div>
                    <div style="margin-top: 10px; font-size: 0.9em;">
                        Remember: Wet → Soap → Scrub → Rinse → Dry
                    </div>
                `;
                feedback.className = 'drag-feedback incorrect-feedback';
            }
            
            submitBtn.style.display = 'none';
        });

        resetBtn.addEventListener('click', () => {
            // Reset all items to original container
            dragItems.forEach(item => {
                item.classList.remove('in-zone');
                item.setAttribute('draggable', 'true');
                item.removeAttribute('data-order');
                item.style.animation = '';
                dragContainer.appendChild(item);
            });
            
            order = [];
            feedback.style.display = 'none';
            submitBtn.style.display = 'none';
            resetBtn.style.display = 'none';
            updateProgress();
            
            // Reset body animation
            document.body.style.animation = '';
        });

        // Add celebration keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes celebration {
                0%, 100% { transform: scale(1); }
                25% { transform: scale(1.02); }
                50% { transform: scale(1.01); }
                75% { transform: scale(1.02); }
            }
        `;
        document.head.appendChild(style);

        // Initialize progress
        updateProgress();
        // Auto-start intro tour on page load
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                if (typeof startHandwashingTutorial === 'function') {
                    startHandwashingTutorial();
                }
            }, 800);
        });