# CodeClarity API

<br>

<div align="center">
    <img src="https://user-images.githubusercontent.com/124595411/233356880-fdc7ea8a-8b1d-4991-8726-67b47e91df9e.svg" width="400px" />
</div>

<br>

## Purpose

The following repository contains the source code material for our public API, powered by NestJS.

## Getting started

1. `make build`
2. `make build-dev`
3. `TEST_EMAIL=<test-email-address> MAIL_AUTH_PASSWORD=<smtp-password> make up-dev`

    1. `<test-email-address>` is an email address on which you will recieve all emails during development. This is so we do not spam real-world email addresses of real people during development.
    2. `<smtp-password>` the password needed to authenticate to the smtp server. <span style='color:red'>Under no circumstance put this into one of the .env files!</span>
    3. To make your life easier, export these environment variables in `/etc/environment`, so you don't need to specify them every time.

## API Responses

### API data
Every response from the API includes two fields:
 - `status` a textual indication of whether the request succeeded or not (`"success"` or `"failure"`)
 - `status_code` the numerical http status code (`200`,`400`, `500`, ...)

Every error returned from the API includes two additional fields:
 - `error_code` a textual error code (`"UnkownAnalysis"`, `"UnkownWorkspace"`, `"UnprocessableEntity"`, ...)
 - `error_message` an error message/description

Note: that the presence of these fields is enforced by the `ExceptionFilter` and the `ResponseBodyInterceptor`.

### API conventions
 - **Error handling**: Our API indicates failures and success via HTTP status codes (`200`,`400`, `500`) and also by including respective fields in the returned JSON body. Allowing consumers of the API to employ their preffered style of error handling.
    - `Success`:
        ```json
        // HTTP status code: 200
        {
            "status_code": 200,
            "status": "success",
            "data": { ... }
        }
        ```
    - `Error`: 
        ```json
        // HTTP status code: 400
        {
            "status_code": 400,
            "status": "failure",
            "error_code": "UnkownWorkspace",
            "error_message": "The referenced workspace does not exist"
        }
        ```
 - **Casing**: All the responses from our API are in underscore/snake case. The same applies to query and body parameters.