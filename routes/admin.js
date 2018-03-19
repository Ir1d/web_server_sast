var express = require('express');
let mysql = require('mysql');
var router = express.Router();
let config = require('../database/configure.json');
let check = require('../public/javascripts/check');

let admin_cfg = config.admin;
let guest_cfg = config.guest;

pool_admin = mysql.createPool(admin_cfg);
pool_guest = mysql.createPool(guest_cfg);

/** 管理登录界面 */
router.get('/', function(req, res){
    let action = req.query.action;
    if(action === "login")
    {
        res.render('login', {admin: true});
    }
    else
    {
        let ip_info = req.headers.remoteip || req.socket.remoteAddress; 
        let now = new Date();
        let timestamp = now.getTime();
        let id = req.query.id;
        let std_id = /^[\d]+$/;
        if(!std_id.test(id))
        {
            res.redirect('/admin/?action=login');
        }
        else
        {
            check.check_already_login(id, ip_info, timestamp, true, function(already, valid){
                if(!already || !valid)
                {
                    res.redirect('/admin/?action=login');
                }
                else
                {
                    if(action === "contests")
                    {
                        res.render('contests', {admin: true, id: id});
                    }
                    else if(action === "volunteers")
                    {
                        res.render('volunteers', {admin: true, id: id});
                    }
                    else if(action === "home")
                    {
                        res.render('index', {id: id, admin: true});
                    }
                    else if(action === "about_us")
                    {
                        res.render('about_us', {id: id, admin: true});
                    }
                    else if(action === "downloads")
                    {
                        res.render('downloads', {id: id, admin: true});
                    }
                    else if(action === "join_us")
                    {
                        res.render('join_us', {id: id, admin: true});
                    }
                    else if(action === "manage_contest")
                    {
                        let contest = req.query.contest;
                        res.render('manage_state', {id: id, job: "contest", detail: contest});
                    }
                    else if(action === "manage_activity")
                    {
                        let activity = req.query.activity;
                        res.render('manage_state', {id: id, job: "activity", detail: activity});
                    }
                    else if(action === "check_contest")
                    {
                        let contest = req.query.contest;
                        let team_id = req.query.team_id;
                        check.check_team(team_id, function(done){
                            if(!done)
                            {
                                res.render('error', {error: {}, message: "为队伍"+team_id+"签到失败，请重试", action:`/admin/?id=${id}&contest=${contest}&action=manage_contest`});
                            }
                            else
                            {
                                res.render('error', {error: {}, message: "为队伍"+team_id+"签到成功", action:`/admin/?id=${id}&contest=${contest}&action=manage_contest`});
                            }
                        });
                    }
                    else if(action === "check_activity")
                    {
                        let activity = req.query.activity;
                        let group = req.query.group;
                        let volunteer_id = req.query.volunteer_id;
                        check.check_activity(volunteer_id, activity, group, function(done, msg){
                            if(!done)
                            {
                                res.render('error', {error: {}, message: msg, action:`/admin/?id=${id}&activity=${activity}&action=manage_activity`});
                            }
                            else
                            {
                                res.render('error', {error: {}, message: msg, action:`/admin/?id=${id}&activity=${activity}&action=manage_activity`});
                            }
                        });
                    }
                    else if(action === "prize_contest")
                    {
                        let contest = req.query.contest;
                        let team_id = req.query.team_id;
                        let prize = req.query.prize;
                        check.give_prize(team_id, prize, function(done){
                            if(!done)
                            {
                                res.render('error', {error: {}, message: "为队伍"+team_id+"确定奖项失败，请重试", action:`/admin/?id=${id}&contest=${contest}&action=manage_contest`});
                            }
                            else
                            {
                                res.render('error', {error: {}, message: "为队伍"+team_id+"确定奖项成功", action:`/admin/?id=${id}&contest=${contest}&action=manage_contest`});
                            }
                        });
                    }
                }
            });
        }
    }

  });

/**  管理员登录 */
router.post('/login', function(req, res){
    let university = req.body.university;
    let number = req.body.number;
    let password = req.body.password;
    pool_admin.getConnection(function(err, conn){
        if(err){console.log(err);res.render('error', {error: err, message: "登录失败", action: "/"});}
        else
        {
            let sql = `select id,name from users where university=${university} and number=${number};`;
            conn.query(sql, function(err, rows){
            if(typeof(rows) === "undefined" || rows.length < 1)
            {
                res.render('error', {error: {}, message: "用户不存在", action: "/"});
            }
            else if(rows.length > 1)
            {
                res.render('error', {error: {}, message: "该账号对应多个用户,后台数据库错误", action: "/"});
            }
			else
			{
				let sql = `select password from admin_pass where id = 1;`;
				conn.query(sql, function(err, rows1){
					if(err || rows1 === undefined || rows1.length < 1)
					{
						console.log(err);
						res.render('error', {error: err, message: "登录失败", action: "/"});
					}
					else
					{
						if(password !== rows1[0].password)
						{
							res.render('error', {error:{}, message: "密码错误", action: "/"});
						}
						else
						{
							let now = new Date();
							let timestamp = now.getTime();
							let ip_info = req.headers.remoteip || req.socket.remoteAddress;
							check.check_already_login(rows[0].id, ip_info, timestamp, true, function(already, valid){
								if(already === false)
								{
									check.add_login(rows[0].id, ip_info, timestamp, true, function(done){
									if(!done)
									{
										res.render('error', {error:{}, message: "管理员登录失败", action: "/"});
									}
									else
									{
										res.redirect(`/admin/?action=home&id=${rows[0].id}`);
									}
									});
								}
								else
								{
									check.refresh_login(rows[0].id, ip_info, timestamp, true, function(done){
									if(!done)
									{
										res.render('error', {error: {}, message: "管理员登录失败", action: "/"});
									}
									else
									{
										res.redirect(`/admin/?action=home&id=${rows[0].id}`);
									}
									});
								}
							});        
						}
					}
				});
			}
        });
        conn.release();
    }
    });
  });

module.exports = router;