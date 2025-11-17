"use client"
import React from 'react';

export default function Custom404Page() {
  
  const handleGoHome = () => {
    // Simple navigation using window.location
    window.location.href = '/';
  };

  return (
    <>
      {/* Bootstrap CSS */}
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css" 
      />
      {/* Google Fonts */}
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css?family=Arvo" 
      />
      
      <style jsx>{`
        /*======================
            404 page
        =======================*/

        .page_404 { 
          padding: 40px 0; 
          background: #fff; 
          font-family: 'Arvo', serif;
        }

        .page_404 img { 
          width: 100%;
        }

        .four_zero_four_bg {
          height: auto;
          background-position: center;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: -20px;
        }
        
        .gif_container {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px auto;
          padding: 0 15px;
        }
        
        .gif_container img {
          width: 100%;
          height: auto;
          max-width: 500px;
          display: block;
          margin: 0 auto;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .gif_container img {
            max-width: 400px;
          }
        }
        
        @media (max-width: 480px) {
          .gif_container img {
            max-width: 320px;
          }
        }

        .four_zero_four_bg h1 {
          font-size: 80px;
        }

        .four_zero_four_bg h3 {
          font-size: 80px;
        }

        .link_404 {
          color: #fff !important;
          padding: 10px 20px;
          background: #39ac31;
          margin: 20px 0;
          display: inline-block;
          text-decoration: none;
          cursor: pointer;
          border: none;
          font-family: 'Arvo', serif;
        }

        .link_404:hover {
          background: #2d8a26;
          color: #fff !important;
          text-decoration: none;
        }

        .contant_box_404 { 
          margin-top: 10px;
          text-align: center;
        }

        .h2 {
          font-size: 30px;
          font-weight: normal;
        }

        .text-center {
          text-align: center;
        }

        .container {
          padding-right: 15px;
          padding-left: 15px;
          margin-right: auto;
          margin-left: auto;
        }

        @media (min-width: 768px) {
          .container {
            width: 750px;
          }
        }

        @media (min-width: 992px) {
          .container {
            width: 970px;
          }
        }

        @media (min-width: 1200px) {
          .container {
            width: 1170px;
          }
        }

        .row {
          margin-right: -15px;
          margin-left: -15px;
        }

        .col-sm-12 {
          position: relative;
          min-height: 1px;
          padding-right: 15px;
          padding-left: 15px;
        }

        @media (min-width: 768px) {
          .col-sm-12 {
            float: left;
            width: 100%;
          }
          .col-sm-10 {
            float: left;
            width: 83.33333333%;
          }
          .col-sm-offset-1 {
            margin-left: 8.33333333%;
          }
        }

        .col-sm-10 {
          position: relative;
          min-height: 1px;
          padding-right: 15px;
          padding-left: 15px;
        }

        body {
          margin: 0;
          font-family: 'Arvo', serif;
        }
      `}</style>

      <section className="page_404">
        <div className="container">
          <div className="row">	
            <div className="col-sm-12">
              <div className="col-sm-10 col-sm-offset-1 text-center">
                <div className="four_zero_four_bg">
                  <h1 className="text-center">Unauthorized</h1>
                </div>
                
                <div className="gif_container">
                  <img 
                    src="https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif" 
                    alt="404 Animation"
                  />
                </div>
                
                <div className="contant_box_404">
                  <h3 className="h2">
                    Look like you're lost
                  </h3>
                  
                  <p>the page you are looking for not available!</p>
                  
                  <button 
                    onClick={handleGoHome}
                    className="link_404"
                  >
                    Go to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}