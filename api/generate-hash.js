import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  try {
    const { password } = req.query;
    
    if (!password) {
      return res.status(400).json({ 
        error: 'Parametro password mancante',
        usage: '/api/generate-hash?password=tuapassword'
      });
    }
    
    // Genera hash con bcrypt (10 rounds)
    const hash = await bcrypt.hash(password, 10);
    
    return res.status(200).json({ 
      success: true,
      password: password,
      hash: hash,
      rounds: 10,
      sqlUpdate: `UPDATE users SET password = '${hash}' WHERE username = 'admin';`
    });
  } catch (error) {
    console.error('Errore generazione hash:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
}
