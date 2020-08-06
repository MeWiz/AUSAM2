// these constants define boundaries of text in the ADS. For example faculty scholarly activity is between the text listed in FAC_SA_START and FAC_SA_END
const FAC_SA_START = "Faculty Scholarly Activity";
const FAC_SA_END = "Faculty Development";
const RES_SA_START = "Resident Scholarly Activity";
const RES_SA_END = "List Of Residents On Leave";
const FELLOW_SA_START = "Fellow Scholarly Activity";
const FELLOW_SA_END = "Post Graduate PMIDs";
const LIC_START = 'Current Licensure Data';
const LIC_END = 'Academic Appointments';

// each time an action completes, progressbar advances by... (6 events adding up to 100%)
const PROGRESSBAR_ADVANCE = 17;	

// global vars to track stats
var pmid_count=0;
var pmid_errors=0;
var lic_count=0;
var lic_errors=0;
var board_count=0;
var board_errors=0;

// url where demo video is located
const DEMO_VIDEO_URL = 'ausam2_instructions.pdf';
const NOT_FOUND_HTML = "<p><i><b>Could not find any info for this category. This may happen when you cut and paste from a PDF or web output rather than the HTML code generated by ADS. Please try again using the HTML code of the ADS web page.</b></i></p><p>&nbsp;</p><p>You can view a <a href='"+DEMO_VIDEO_URL+"'>how-to</a> here.</p><p>&nbsp;</p><p>If you think this is an error, please contact <a href='mailto:ngoyal1@hfhs.org'>Nikhil Goyal</a> with the entire text that you pasted in the box.</p>"

$(document).ready(function() {
	"use strict";
    
	$("#tabs").tabs();

	var progressbar = $( "#progressbar" ), progressLabel = $( ".progress-label" );
	progressbar.hide();
    progressbar.progressbar({
		value: false,
		change: function() { progressLabel.text( progressbar.progressbar( "value" ) + "%" );},
		complete: function() { progressLabel.text( "Complete!" ); }
	});

	$('#doit').on('click', function(){process();});
	$('#clear').on('click', function(){reset_form();});
    $('#progressbar').progressbar({complete: function(event, ui){
        // completed; write stats to db
        const urlParams = new URLSearchParams(window.location.search);
        const myParam = urlParams.get('nolog');
        if (myParam==null) {
            // if nolog not set, log stats
            setTimeout(function() {
                $.ajax({
                    url: 'php/log_statistics.php',
                    data: {
                        'pmid_count': pmid_count,
                        'pmid_errors': pmid_errors,
                        'lic_count': lic_count,
                        'lic_errors': lic_errors,
                        'board_count': board_count,
                        'board_errors': board_errors,
                    },
                    dataType: 'text',
                    method: 'post',
                }).success(function(){
                    console.log("Stats recorded");
                }).error(function( xhr, status, errorThrown ) {
                    console.log( "Error writing stats: " + errorThrown );
                    console.log( "Status: " + status );
                    console.dir( xhr );
                });
            },1000);
        }
    }});
    $('#adstext').focus();
});

function reset_form() {
	// reset form - call default html function plus re-init previous data table results
	"use strict";
	$('#progressbar').progressbar("value", false).hide();
	$('#pmid_table').hide().data("flag_row", 0).data("nomatch_row",0);
	$('#pmid_table').find("tr:gt(0)").remove();
	$('#license').html('');
	$('#license').removeClass();
	$('#board_table').hide();
	$('#board_table').find("tr:gt(0)").remove();
    pmid_count=pmid_errors=lic_count=lic_errors=board_count=board_errors=0;
}

function modal_dialog(title, htmltext, mail_send=false) {
	if (mail_send!==false) {
		// send email notification to ngoyal; mail_send has the data to send
        var mailbody="Title: "+title+"\r\nErrorMsg: "+htmltext+"\r\n\r\nDebug: "+JSON.stringify(mail_send, null, 3);
		$.ajax({
			url: 'php/sendmail.php',
			data: {
				'mail_send': mailbody,
			},
			method: 'post'
		}).done(function(xhr) {
			console.log("sendmail return");
			console.log(xhr);
		});
	}
    var modal_rand="modaldialog_"+Math.floor(Math.random()*100);
    $('body').append("<div id='"+modal_rand+"'></div>");
	$('#'+modal_rand).html(htmltext);
	$('#'+modal_rand).dialog({
		modal: true,
		title: title,
		buttons: {
			Close: function() {$(this).dialog("close");}
		}
	});
}

function process() {
	// form submitted
	"use strict";
	if ($('#adstext').val().length<10) {
		modal_dialog("Missing Data", "Please copy-paste entire HTML code from ADS annual update. You can view <a href='"+DEMO_VIDEO_URL+"'>instructions</a> here.");
		return false;
	}
    if ($('#adstext').val().search("<body")==-1) {
        modal_dialog("Need HTML Code", "AUSAM2 works best with HTML code from the ADS page, as explained in the <a href='"+DEMO_VIDEO_URL+"'>instructions</a> here (Summary: Hold down <b>Ctrl</b> and press <b>U, A, C</b> on the 'Print Annual Update' page,  paste that code here).<p>&nbsp;<p><b>Results displayed will be inconsistent or incomplete.</b>", $('#adstext').val());
//        return false;
    }
	
	reset_form();
	$('#progressbar').show();
	var text=$('#adstext').val();
	var pb_val;

	// process PMIDs
	var fac_start=text.indexOf(FAC_SA_START);
	if (fac_start===-1) {fac_start=text.indexOf(FAC_SA_START.toUpperCase());}
	var fac_end=text.indexOf(FAC_SA_END, fac_start);
	if (fac_end===-1) {fac_end=text.indexOf(FAC_SA_END.toUpperCase(), fac_start);}
	var res_start=text.indexOf(RES_SA_START);
	if (res_start===-1) {res_start=text.indexOf(RES_SA_START.toUpperCase());}
	if (res_start===-1) {res_start=text.indexOf(FELLOW_SA_START);}
	if (res_start===-1) {res_start=text.indexOf(FELLOW_SA_START.toUpperCase());}
	var res_end=text.indexOf(RES_SA_END, res_start);
	if (res_end===-1) {res_end=text.indexOf(RES_SA_END.toUpperCase(), res_start);}
	if (res_end===-1) {res_end=text.indexOf(FELLOW_SA_END, res_start);}
	if (res_end===-1) {res_end=text.indexOf(FELLOW_SA_END.toUpperCase(), res_start);}
	var subtext=text.substring(fac_start, fac_end)+text.substring(res_start, res_end);
   console.log(fac_start, fac_end, res_start, res_end, subtext);
	if (subtext.length<10) {
		// no scholarly activity block present
		$('#pmid_table').append('<tr><td colspan="4">'+NOT_FOUND_HTML+'</td></tr>');
		$('#pmid_table').show();
		pb_val=$('#progressbar').progressbar("value");
		$('#progressbar').progressbar("value", pb_val+PROGRESSBAR_ADVANCE+PROGRESSBAR_ADVANCE);
	}
	else {
		$.ajax({
			url: "php/pubmed.php",
			data: {
				ay: $('#acyr').val(),
				pmidblock: subtext
			},
			dataType: "json",
			method: "POST",
			success: function(rval){
				pb_val=$('#progressbar').progressbar("value");
				$('#progressbar').progressbar("value", pb_val+PROGRESSBAR_ADVANCE);
				console.log('PubMed AJAX Returned:');
				console.dir(rval);
				pmid_processed(rval);
			},
			error: function( xhr, status, errorThrown ) {
				modal_dialog( "PubMed AJAX error", "Unexpected result. Please contact <a href='mailto:ngoyal1@hfhs.org'>Nikhil Goyal</a>", xhr );
				console.log( "Error: " + errorThrown );
				console.log( "Status: " + status );
				console.dir( xhr );
			}
		});
	}
	
	// Licensure data
	var lic_start=text.indexOf(LIC_START);
	if (lic_start===-1) {lic_start=text.indexOf(LIC_START.toUpperCase());}
	var lic_end=text.indexOf(LIC_END);
	if (lic_end===-1) {lic_end=text.indexOf(LIC_END.toUpperCase());}
	subtext=text.substring(lic_start, lic_end);
	if (subtext.length<10) {
		// no license block present
		$('#license').append(NOT_FOUND_HTML);
		pb_val=$('#progressbar').progressbar("value");
		$('#progressbar').progressbar("value", pb_val+PROGRESSBAR_ADVANCE+PROGRESSBAR_ADVANCE);
	}
	else {
		$.ajax({
			url: "php/license_check.php",
			data: {licblock: subtext},
			dataType: "json",
			method: "POST",
			success: function(rval){
				pb_val=$('#progressbar').progressbar("value");
				$('#progressbar').progressbar("value", pb_val+PROGRESSBAR_ADVANCE);
				console.log('License AJAX Returned:');
				console.dir(rval);
				lic_processed(rval);
			},
			error: function( xhr, status, errorThrown ) {
				modal_dialog( "License AJAX error", "Unexpected result. Please contact <a href='mailto:ngoyal1@hfhs.org'>Nikhil Goyal</a>", xhr );
				console.log( "Error: " + errorThrown );
				console.log( "Status: " + status );
				console.dir( xhr );
			}
		});
	}
	
	// Board certification data - send all html
    $.ajax({
        url: "php/boardcert_check.php",
        data: {boardblock: text},
        dataType: "json",
        method: "POST",
        success: function(rval){
            pb_val=$('#progressbar').progressbar("value");
            $('#progressbar').progressbar("value", pb_val+PROGRESSBAR_ADVANCE);
            console.log('Board Cert AJAX Returned:');
            console.dir(rval);
            board_processed(rval);
        },
        error: function( xhr, status, errorThrown ) {
            modal_dialog( "BoardCert AJAX error", "Unexpected result. Please contact <a href='mailto:ngoyal1@hfhs.org'>Nikhil Goyal</a>", xhr );
            console.log( "Error: " + errorThrown );
            console.log( "Status: " + status );
            console.dir( xhr );
        }
    });
}

function pmid_processed(rval) {
	// PMID data returned from AJAX
	"use strict";
	if (rval.pmid_count===0) {
		modal_dialog("No PMIDs found!", "No scholarly activity PMIDs were read in either the resident or faculty tables. <p>If you feel this is an error, please contact <a href='mailto:ngoyal1@hfhs.org'>Nikhil Goyal</a> with the entire text that you pasted in the box");
		return false;
	}

	if (rval.error.code!==0) {
		modal_dialog("Error processing PubMed", "Please contact <a href='mailto:ngoyal1@hfhs.org'>Nikhil Goyal</a> with the entire text that you pasted in the box.<p>", rval.error.text);
		return false;
	}

	var flags=0, nomatch=0;
	$.each(rval.pmids, function(key, val) {
        pmid_count++;
		var rowid='pmid_'+key;
		if (val.date_type==='epubdate') {val.date+=" <span class='epub_indicator'>(ePub)</span>";}
		else if (val.date_type==='entrezdate') {val.date+=" <span class='epub_indicator'>(Entrez Date)</span>";}
		
		if (val.date_found===1) {
			$('#pmid_table').append('<tr id="'+rowid+'"><td>'+key+'</td> <td nowrap>'+val.date+'</td> <td>'+val.authorstr+'</td> <td>'+val.title+'</td> </tr>');
			if (val.date_valid===0) {
				// pubdate is outside AY rage
				$('#'+rowid).children('td').addClass('flag_row');
				$('#pmid_table').data("flag_row", ++flags);
			}
		}
		else {
			// no date read from PMID record
			$('#pmid_table').append('<tr id="'+rowid+'"><td>'+key+'</td> <td colspan="4">Date could not be read (Incorrect PMID?)</td> </tr>');
			$('#'+rowid).children('td').addClass('nomatch_row');
			$('#pmid_table').data("nomatch_row", ++nomatch);
		}
	});
	$('#pmid_table').show();
	var val=$('#progressbar').progressbar("value");
	$('#progressbar').progressbar("value", val+PROGRESSBAR_ADVANCE);
    pmid_errors=flags+nomatch;
    console.log("PMIDs: "+pmid_count+" Processed, "+pmid_errors+" Errors");
}

function lic_processed(rval) {
	// Medical license date check returned from AJAX
	"use strict";
	
	if (rval.error.code!==0) {
		modal_dialog("Error processing License", "Please contact <a href='mailto:ngoyal1@hfhs.org'>Nikhil Goyal</a> with the entire text that you pasted in the box.<p>", rval.error.text);
		return false;
	}

    lic_count=1;
	$('#license').append('<p>PD\'s License Expiration: '+rval.month+' '+rval.year+'. <i>'+rval.months_to_exp+' month(s) remain.</i></p>');
	if (rval.expired===1) {
		$('#license').addClass('flag_row');
        lic_errors=1;
	}
	else if (rval.months_to_exp<=6) {
		$('#license').addClass('nomatch_row');
	}
	var val=$('#progressbar').progressbar("value");
	$('#progressbar').progressbar("value", val+PROGRESSBAR_ADVANCE);
    console.log("Licenses Processed: "+lic_count+", errors: "+lic_errors);
}

function board_processed(rval) {
	// Board check returned from AJAX
	"use strict";

	if (rval.error.code!==0) {
		if (rval.error.code===2) {
			$('#board_table').append("<tr><td colspan='3'>"+NOT_FOUND_HTML+"</td></tr>");
			$('#board_table').show();
			var val=$('#progressbar').progressbar("value");
			$('#progressbar').progressbar("value", val+PROGRESSBAR_ADVANCE);
		}
		else {
			modal_dialog("Error processing BoardCert", "Please contact <a href='mailto:ngoyal1@hfhs.org'>Nikhil Goyal</a> with the entire text that you pasted in the box.<p>", rval.error.text);
		}
		return false;
	}
	
	$.each(rval.results, function(key, val) {
        board_count++;
		var rowid="staffid_"+key;
		var toappend='<tr id="'+rowid+'"><td>'+val.name+'</td><td>'+val.specialty+'</td><td>';
		if (val.issues!==0) { toappend+=val.descr; }
		else {toappend+="OK";}
		toappend+="</td></tr>";
		$('#board_table').append(toappend);
		if (val.issues===1) {
            $('#'+rowid).children('td').addClass('flag_row');
            board_errors++;
        }
		else if (val.issues===2) {$('#'+rowid).children('td').addClass('nomatch_row');}
	});

	$('#board_table').show();
	var pb_val=$('#progressbar').progressbar("value");
	$('#progressbar').progressbar("value", pb_val+PROGRESSBAR_ADVANCE);
    console.log("Board Certs processed: "+board_count+", errors: "+board_errors);
}