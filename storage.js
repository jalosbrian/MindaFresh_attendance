import 'dotenv/config';
import {Sequelize} from 'sequelize';
export const db=new Sequelize(process.env.DB_NAME||'mindafresh_db',process.env.DB_USER||'root',process.env.DB_PASSWORD||'',{host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),dialect:'mysql',logging:false,timezone:'+08:00'});
