import codecs
with codecs.open('src/components/tabs/SlotGeneratorTab.tsx', 'r', 'utf-8') as f:
    content = f.read()

old_ui = '''          </div>
          <span className="text-xs text-dashboard-text-secondary sm:text-right leading-relaxed">
            ╰参盢穦玻荷秖锣近い才兵ン斑程ㄎ皌竚
          </span>
        </div>'''
new_ui = '''          </div>
          <div className="flex flex-col gap-2 items-end">
            <span className="text-xs text-dashboard-text-secondary sm:text-right leading-relaxed">
              ╰参盢穦玻荷秖锣近い才兵ン斑程ㄎ皌竚
            </span>
            {gameType === 'linegame_gods' && (
              <button
                onClick={() => setIsFreeGame(!isFreeGame)}
                className={px-3 py-1.5 rounded text-xs font-bold transition-colors $}
              >
                {isFreeGame ? 'FG 家Α (WY)' : 'BG 家Α (WX)'}
              </button>
            )}
          </div>
        </div>'''

if '╰参盢穦玻荷秖' in content:
    content = content.replace(old_ui, new_ui)

old_cond1 = '''                      .map(c => {
                        let rngStr = '';
                        if (gameType === 'linegame_set2') {'''
new_cond1 = '''                      .map(c => {
                        let rngStr = '';
                        if (gameType === 'linegame_set2' || gameType === 'linegame_gods') {'''
content = content.replace(old_cond1, new_cond1)

old_cond2 = '''                        if (gameType === 'linegame_set2') {
                          const mathIdsStr = isManualEdited && selectedCombIndex === globalIdx'''
new_cond2 = '''                        if (gameType === 'linegame_set2' || gameType === 'linegame_gods') {
                          const mathIdsStr = isManualEdited && selectedCombIndex === globalIdx'''
content = content.replace(old_cond2, new_cond2)

content = content.replace(
    '''rngStr = classStr ? \${mathIdsStr}, ,\ : \${mathIdsStr},\;''',
    '''rngStr = classStr ? \${mathIdsStr},\t,\ : \${mathIdsStr},\;'''
)
content = content.replace(
    '''const finalCopy = classStr ? \${mathIdsStr}, ,\ : \${mathIdsStr},\;''',
    '''const finalCopy = classStr ? \${mathIdsStr},\t,\ : \${mathIdsStr},\;'''
)

with codecs.open('src/components/tabs/SlotGeneratorTab.tsx', 'w', 'utf-8') as f:
    f.write(content)
