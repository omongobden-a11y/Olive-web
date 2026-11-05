const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Build the complete clean #pay-fees section
const payFeesSection = `    <!-- Pay Fees Tab / Section: Official School Fees, Requirements & Fees Calculator -->
    <section id="pay-fees" class="bg-subtle" style="padding: 70px 0;">
      <a id="fees" style="display:none;"></a>
      <a id="payments" style="display:none;"></a>
      <div class="container">
        <div style="text-align: center; margin-bottom: 40px;">
          <span class="section-eyebrow">Transparent &amp; Affordable</span>
          <h2>Official School Fees Structure &amp; Fees Calculator</h2>
          <p class="section-lead" style="margin: 0 auto;">Zero hidden charges. Part payments and installments are accepted. Boarding is compulsory for P.5, P.6, and P.7.</p>
        </div>

        <!-- Official Bank Info Banner -->
        <div style="background:var(--bg-surface); border:2px solid var(--gold); border-radius:var(--radius-md); padding:20px 24px; margin-bottom:32px; display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap; box-shadow:var(--shadow-sm);">
          <div style="display:flex; align-items:center; gap:16px;">
            <span style="font-size:2.2rem;">🏦</span>
            <div>
              <div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:var(--crimson); letter-spacing:1px;">Official School Bank Account</div>
              <h3 style="margin:2px 0; color:var(--text-main); font-size:1.25rem;">Opportunity Bank, Kamdini branch</h3>
              <p style="margin:0; font-size:1rem; color:var(--text-muted);">Account Number: <b style="color:var(--crimson); font-size:1.15rem; letter-spacing:1px;">120396591117</b> (Olive Nursery and Primary School - Atapara)</p>
            </div>
          </div>
          <button class="btn btn-gold btn-sm" onclick="copyBankAccount()">📋 Copy Bank Account</button>
        </div>

        <div class="admissions-hub-grid">
          <!-- Left: Official Fee Structure Breakdown -->
          <div>
            <h3 style="color:var(--crimson); margin-bottom:14px;">Official Term School Fees (Uganda Shillings)</h3>
            
            <div class="data-table-wrap" style="margin-bottom:20px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Class Level</th>
                    <th>Day Scholar</th>
                    <th>Boarding Section</th>
                    <th>Payment Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>Nursery (Baby, Middle, Top)</b></td>
                    <td><b style="color:var(--crimson);">UGX 78,000</b></td>
                    <td><b style="color:var(--crimson);">UGX 158,500</b></td>
                    <td>Installments accepted</td>
                  </tr>
                  <tr>
                    <td><b>Lower Primary (P.1 – P.3)</b></td>
                    <td><b style="color:var(--crimson);">UGX 88,500</b></td>
                    <td><b style="color:var(--crimson);">UGX 158,500</b></td>
                    <td>Installments accepted</td>
                  </tr>
                  <tr>
                    <td><b>Primary Four (P.4)</b></td>
                    <td><b style="color:var(--crimson);">UGX 108,500</b></td>
                    <td><b style="color:var(--crimson);">UGX 168,500</b></td>
                    <td>Installments accepted</td>
                  </tr>
                  <tr style="background:rgba(212,154,22,0.06);">
                    <td><b>Primary Five (P.5)</b></td>
                    <td><span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;">Compulsory Boarding</span></td>
                    <td><b style="color:var(--crimson);">UGX 168,500</b></td>
                    <td>Boarding only</td>
                  </tr>
                  <tr style="background:rgba(212,154,22,0.06);">
                    <td><b>Primary Six (P.6)</b></td>
                    <td><span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;">Compulsory Boarding</span></td>
                    <td><b style="color:var(--crimson);">UGX 178,500</b></td>
                    <td>Boarding only</td>
                  </tr>
                  <tr style="background:rgba(212,154,22,0.06);">
                    <td><b>Primary Seven (P.7 - Candidate)</b></td>
                    <td><span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;">Compulsory Boarding</span></td>
                    <td><b style="color:var(--crimson);">UGX 188,500</b></td>
                    <td>PLE Candidate coaching</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:18px; margin-bottom:20px; font-size:0.92rem; line-height:1.7;">
              <div style="margin-bottom:8px;">📌 <b>Compulsory Holiday Package:</b> <b>UGX 10,000</b> each term for all pupils from Baby Class to P.7.</div>
              <div style="margin-bottom:8px;">📌 <b>Compulsory Boarding:</b> Boarding is compulsory for P.5, P.6, and P.7 to ensure intensive study and guidance.</div>
              <div>📌 <b>Part Payments:</b> Parents can pay school fees in affordable installments throughout the term.</div>
            </div>

            <div style="background:linear-gradient(135deg, var(--crimson), var(--crimson-dark)); color:#fff; border-radius:var(--radius-sm); padding:20px;">
              <h4 style="color:#fff; margin:0 0 6px;">📱 Instant Mobile Money Payment</h4>
              <p style="margin:0 0 14px; font-size:0.92rem; color:#ffebee;">Pay directly via MTN Mobile Money (*165#) or Airtel Money (*185#). Official digital receipt issued immediately.</p>
              <button class="btn btn-gold btn-sm" data-open-payment>Pay School Fees Now ➔</button>
            </div>
          </div>

          <!-- Right: Interactive Fees Calculator -->
          <div>
            <div class="calculator-card">
              <h3 style="color:var(--crimson); margin-bottom:4px;">🧮 Fees Calculator</h3>
              <p style="color:var(--text-muted); font-size:0.92rem; margin-bottom:18px;">Select class and options to calculate exact term school fees.</p>

              <div id="calc-boarding-notice" style="display:none; background:#fff3cd; border:1px solid #ffeeba; color:#856404; padding:10px 14px; border-radius:6px; font-size:0.88rem; margin-bottom:14px;"></div>

              <div class="calc-field">
                <label for="calc-class">Select Pupil Class</label>
                <select id="calc-class" class="calc-select">
                  <option value="nursery">Nursery Section (Baby K-1, Middle K-2, Top K-3)</option>
                  <option value="lower_primary">Lower Primary Section (P.1 – P.3)</option>
                  <option value="p4">Primary Four (P.4)</option>
                  <option value="p5">Primary Five (P.5) [Compulsory Boarding]</option>
                  <option value="p6">Primary Six (P.6) [Compulsory Boarding]</option>
                  <option value="p7" selected>Primary Seven (P.7) [Compulsory Boarding]</option>
                </select>
              </div>

              <div class="calc-field">
                <label for="calc-type">Section Type</label>
                <select id="calc-type" class="calc-select">
                  <option value="day">Day Scholar</option>
                  <option value="boarding" selected>Full Boarding (Bed, Food Stuffs &amp; 24/7 Care)</option>
                </select>
              </div>

              <div class="calc-field">
                <label>Compulsory &amp; Optional Items (From Circular)</label>
                <div class="calc-checkboxes">
                  <label class="calc-check-label" style="background:var(--bg-subtle); font-weight:600;">
                    <input type="checkbox" id="calc-holiday-pkg" checked disabled>
                    <span>Compulsory Holiday Package (UGX 10,000)</span>
                  </label>
                  <label class="calc-check-label" style="background:var(--bg-subtle); font-weight:600;">
                    <input type="checkbox" id="calc-extra-exams" checked disabled>
                    <span>Extra Exams Fee (UGX 2,000 Baby to P.7)</span>
                  </label>
                  <label class="calc-check-label">
                    <input type="checkbox" id="calc-sunday-wear" checked>
                    <span>Weekend / Sunday Boarding Wear (UGX 33,000 - MUST for Boarders)</span>
                  </label>
                  <label class="calc-check-label">
                    <input type="checkbox" id="calc-emis">
                    <span>EMIS Registration / LIN (New Pupil: UGX 3,000)</span>
                  </label>
                  <label class="calc-check-label">
                    <input type="checkbox" id="calc-paper">
                    <span>A Ream of Photocopying Paper (Crane/Rwenzori in Cash: UGX 30,000)</span>
                  </label>
                </div>
              </div>

              <div id="calc-foodstuffs-summary" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:14px; margin-bottom:16px;"></div>

              <div class="calc-summary">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.92rem;">
                  <span>Base School Fees:</span>
                  <span id="calc-base-fees-val">UGX 188,500</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.92rem;">
                  <span>Compulsory Holiday Package:</span>
                  <span id="calc-holiday-val">UGX 10,000</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.92rem;">
                  <span>Selected Optional Items:</span>
                  <span id="calc-items-val">UGX 35,000</span>
                </div>
                <div class="calc-total-row">
                  <span>Total School Fees:</span>
                  <span id="calc-total-val">UGX 233,500</span>
                </div>
              </div>

              <button class="btn btn-gold" id="calc-pay-btn" style="width:100%; margin-top:20px;">
                💳 Pay Calculated School Fees Online
              </button>
            </div>
          </div>
        </div>

        <!-- Dedicated School Requirements & Food Stuffs Section (Direct from Headteacher Circular) -->
        <div id="requirements" style="margin-top: 50px; padding-top: 40px; border-top: 2px solid var(--border-color);">
          <div style="text-align: center; margin-bottom: 32px;">
            <span class="section-eyebrow">Official School Circular</span>
            <h2>School Requirements &amp; Food Stuffs</h2>
            <p class="section-lead" style="margin: 0 auto;">Official requirements issued by Headteacher <b>Mr. Odyek Denish</b> for all pupils reporting to school.</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 32px;">
            <!-- Card 1: Day Scholars Requirements -->
            <div style="background: var(--bg-surface); border: 2px solid #8b1e2b; border-radius: var(--radius-md); padding: 24px; box-shadow: var(--shadow-sm);">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
                <span style="font-size: 1.8rem;">🎒</span>
                <div>
                  <h3 style="color: var(--crimson); margin: 0; font-size: 1.18rem;">Day Scholars Requirements</h3>
                  <small style="color: var(--text-muted);">Nursery &amp; P.1 to P.4 Day Pupils</small>
                </div>
              </div>
              <ul style="color: var(--text-main); padding-left: 20px; line-height: 1.85; font-size: 0.95rem; margin: 0;">
                <li><b>Beans:</b> 06 kg</li>
                <li><b>Maize:</b> 12 kg</li>
                <li><b>Sugar:</b> 2½ kg</li>
                <li><b>Toilet tissues:</b> 2 rolls</li>
                <li><b>Brooms:</b> 2 brooms</li>
                <li><b>Soap:</b> A bar of soap (KUKU)</li>
                <li><b>Learning materials:</b> Enough exercise books, pens &amp; pencils</li>
              </ul>
            </div>

            <!-- Card 2: Boarders Requirements -->
            <div style="background: var(--bg-surface); border: 2px solid #d49a16; border-radius: var(--radius-md); padding: 24px; box-shadow: var(--shadow-sm);">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
                <span style="font-size: 1.8rem;">🛏️</span>
                <div>
                  <h3 style="color: var(--crimson); margin: 0; font-size: 1.18rem;">Boarders Requirements</h3>
                  <small style="color: var(--text-muted);">All Boarding Pupils (Baby to P.7)</small>
                </div>
              </div>
              <ul style="color: var(--text-main); padding-left: 20px; line-height: 1.85; font-size: 0.95rem; margin: 0;">
                <li><b>Beans:</b> 15 kg</li>
                <li><b>Maize:</b> 25 kg</li>
                <li><b>Sugar:</b> 3 kg</li>
                <li><b>Toilet tissues:</b> 2 rolls</li>
                <li><b>Brooms:</b> 2 brooms</li>
                <li><b>Soap:</b> A bar of soap (KUKU)</li>
                <li><b>Books for Candidates:</b> 1 dozen of 3 Quire books for Candidates (P.7) &amp; semi-candidates (P.6)</li>
                <li><b>Weekend / Sunday Wear:</b> UGX 33,000/= (Compulsory)</li>
              </ul>
            </div>

            <!-- Card 3: School Uniforms & Sunday Wear -->
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 24px; box-shadow: var(--shadow-sm);">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
                <span style="font-size: 1.8rem;">👕</span>
                <div>
                  <h3 style="color: var(--crimson); margin: 0; font-size: 1.18rem;">School Uniforms &amp; Sunday Wear</h3>
                  <small style="color: var(--text-muted);">Strict Uniform Policy</small>
                </div>
              </div>
              <div style="background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 12px 14px; border-radius: 6px; font-size: 0.9rem; margin-bottom: 12px;">
                <b>Weekend / Sunday Wear:</b> The school has made enough weekend/Sunday wear for both boys and girls in boarding at a price of <b>UGX 33,000/= only</b>.
              </div>
              <p style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.7; margin: 0;">
                It is therefore a <b>MUST</b> for every boarding pupil to have it to avoid wearing non-uniform or going to church with non-uniform. Parents, this time we are not going to allow non-uniform in the school premises.
              </p>
            </div>

            <!-- Card 4: Scholastic Materials & Compulsory Items -->
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 24px; box-shadow: var(--shadow-sm);">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
                <span style="font-size: 1.8rem;">📚</span>
                <div>
                  <h3 style="color: var(--crimson); margin: 0; font-size: 1.18rem;">Scholastic Materials &amp; Fees</h3>
                  <small style="color: var(--text-muted);">Term Packages &amp; Tools</small>
                </div>
              </div>
              <ul style="color: var(--text-main); padding-left: 20px; line-height: 1.8; font-size: 0.92rem; margin: 0;">
                <li><b>Holiday Package:</b> UGX 10,000/= compulsory each term for all pupils (Baby to P.7).</li>
                <li><b>Extra Exams:</b> UGX 2,000/= from Baby to P.7 class.</li>
                <li><b>EMIS Registration:</b> UGX 3,000/= for new comers and those who do not still have LIN.</li>
                <li><b>Photocopying Paper:</b> A ream of photocopying papers (Crane or Rwenzori) which is once in a year from P.1-P.7.</li>
                <li><b>Scholastic Tools:</b> Math's Set, pens, counter books, foot ruler, graph book, atlas, and Bible for upper primary.</li>
              </ul>
            </div>
          </div>

          <!-- Official Contacts & Resumption Notice Bar -->
          <div style="background: linear-gradient(135deg, #1e191b, #2d0910); color: #fff; border-radius: var(--radius-md); padding: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; align-items: center;">
            <div>
              <div style="color: var(--gold-light); font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Term Resumption Date</div>
              <h3 style="color: #fff; margin: 4px 0 8px; font-size: 1.3rem;">📅 Term III 2026: Begins Monday, 14th September 2026</h3>
              <p style="color: #e5ded4; font-size: 0.92rem; margin: 0; line-height: 1.6;">
                <i>"We strongly advise you to send your child on the first day with enough scholastic materials ready to start serious business."</i><br>
                <b>— ODYEK DENISH, HEADTEACHER</b>
              </p>
            </div>
            <div style="border-left: 1px solid rgba(255,255,255,0.15); padding-left: 20px;">
              <div style="color: var(--gold-light); font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Official Inquiry Contacts</div>
              <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.92rem;">
                <div>📞 <b>Headteacher Primary:</b> <a href="tel:0774996507" style="color: #fff; text-decoration: underline;">0774996507</a> / <a href="tel:039000855" style="color: #fff; text-decoration: underline;">039000855</a></div>
                <div>📞 <b>Deputy Headteacher (Primary):</b> <a href="tel:0777297321" style="color: #fff; text-decoration: underline;">0777297321</a></div>
                <div>📞 <b>Headteacher Nursery:</b> <a href="tel:0775723204" style="color: #fff; text-decoration: underline;">0775723204</a></div>
                <div>📞 <b>Bursar:</b> <a href="tel:0773782383" style="color: #fff; text-decoration: underline;">0773782383</a></div>
                <div>📞 <b>Principal Director:</b> <a href="tel:0782053937" style="color: var(--gold-light); font-weight: 700; text-decoration: underline;">0782053937</a> (Mr. Bennard Atoo)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
`;

// Replace from <section id="pay-fees" to <!-- Staff & Leadership Directory -->
const startMarker = '<section id="pay-fees"';
const endMarker = '<!-- Staff & Leadership Directory -->';

const sIdx = html.indexOf(startMarker);
const eIdx = html.indexOf(endMarker);

if (sIdx !== -1 && eIdx !== -1) {
  html = html.slice(0, sIdx) + payFeesSection.trim() + '\n\n    ' + html.slice(eIdx);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Successfully replaced #pay-fees section cleanly!');
} else {
  console.error('Markers not found', { sIdx, eIdx });
}
